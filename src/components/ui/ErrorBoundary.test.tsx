import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "./ErrorBoundary";

/** A child that throws on demand, so the boundary can be exercised for real. */
function Exploding({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Simulated render failure");
  }
  return <p>Section content</p>;
}

beforeEach(() => {
  // React logs caught render errors; the boundary logs them too. Silenced so a
  // passing suite does not look like a failing one.
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("ErrorBoundary", () => {
  it("renders its children when nothing is wrong", () => {
    render(
      <ErrorBoundary label="chart">
        <Exploding shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Section content")).toBeInTheDocument();
  });

  it("contains a render error instead of letting it reach the page", () => {
    render(
      <ErrorBoundary label="chart">
        <Exploding shouldThrow />
      </ErrorBoundary>
    );

    // The message names the section, so the user knows the scope of the
    // failure rather than assuming the whole app is broken.
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /the chart could not be displayed/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/the rest of the forecast is unaffected/i)
    ).toBeInTheDocument();
  });

  it("recovers when the section is reloaded", async () => {
    const user = userEvent.setup();

    /*
     * A flag rather than a render counter. React retries a failed render
     * several times before giving up and showing the fallback, so "throw on the
     * first attempt" never reaches it — by the time the boundary settles, the
     * child has already succeeded and there is nothing to recover from.
     */
    let shouldFail = true;
    function Flaky() {
      if (shouldFail) throw new Error("Simulated render failure");
      return <p>Section content</p>;
    }

    render(
      <ErrorBoundary label="chart">
        <Flaky />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Fix the cause, then retry.
    shouldFail = false;
    await user.click(
      screen.getByRole("button", { name: /reload this section/i })
    );

    expect(screen.getByText("Section content")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("calls onReset so a caller can refetch alongside the remount", async () => {
    const user = userEvent.setup();
    const onReset = jest.fn();

    render(
      <ErrorBoundary label="chart" onReset={onReset}>
        <Exploding shouldThrow />
      </ErrorBoundary>
    );

    await user.click(
      screen.getByRole("button", { name: /reload this section/i })
    );
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
