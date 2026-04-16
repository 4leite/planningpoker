// Inline script to prevent fouc
// suppressHydrationWarning added to html tag
export const AntiFOUC = () => (
  <script
    dangerouslySetInnerHTML={{
      __html: `
  const isDarkMode = () => {
    if (typeof localStorage !== "undefined" && localStorage['theme'] === "dark") {
      return true
    }
    if (typeof localStorage !== "undefined" && localStorage['theme'] === "light") {
      return false
    }
    return window?.matchMedia("(prefers-color-scheme: dark)").matches
  };
  if (isDarkMode()) {
    document.documentElement.classList.add("dark");
  }
  `,
    }}
  />
)
