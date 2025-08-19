// =================================
// 🧪 LanguageSwitcher Component Tests
// =================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/utils";
import { LanguageSwitcher } from "../LanguageSwitcher";

// Mock i18next
const mockChangeLanguage = vi.fn();
vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useTranslation: () => ({
      i18n: {
        language: "en",
        changeLanguage: mockChangeLanguage,
      },
      t: (key: string) => key,
    }),
    initReactI18next: {
      type: "3rdParty",
      init: vi.fn(),
    },
  };
});

describe("LanguageSwitcher Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders button variant by default", () => {
    render(<LanguageSwitcher />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("app.language");
  });

  it("renders dropdown variant", () => {
    render(<LanguageSwitcher variant="dropdown" />);

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    // Check for the English option instead of display value
    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
  });

  it("renders toggle variant", () => {
    render(<LanguageSwitcher variant="toggle" />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Toggle language");
  });

  it("calls changeLanguage when button is clicked", () => {
    render(<LanguageSwitcher variant="button" />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(mockChangeLanguage).toHaveBeenCalledWith("zh");
  });

  it("calls changeLanguage when dropdown selection changes", () => {
    render(<LanguageSwitcher variant="dropdown" />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "zh" } });

    expect(mockChangeLanguage).toHaveBeenCalledWith("zh");
  });

  // Note: Language switching logic is tested in the basic "calls changeLanguage" tests above

  it("applies custom className", () => {
    render(<LanguageSwitcher className="custom-class" />);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });
});
