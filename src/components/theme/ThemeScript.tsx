export default function ThemeScript() {
  const script = `
    (function () {
      try {
        var stored = localStorage.getItem("duka-theme-preference");
        var preference =
          stored === "light" || stored === "dark" || stored === "system"
            ? stored
            : "system";
        var dark =
          preference === "dark" ||
          (preference === "system" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);
        document.documentElement.classList.toggle("dark", dark);
        document.documentElement.dataset.theme = dark ? "dark" : "light";
        document.documentElement.style.colorScheme = dark ? "dark" : "light";
      } catch (_) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}