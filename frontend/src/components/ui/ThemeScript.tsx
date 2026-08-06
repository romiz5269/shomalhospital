import Script from "next/script";

/** Runs before paint via next/script — avoids React 19 client script warning */
export default function ThemeScript() {
  return (
    <Script
      id="shomal-theme-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var k='shomal_theme';var s=localStorage.getItem(k);var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s||(d?'dark':'light');document.documentElement.classList.toggle('dark',t==='dark');}catch(e){}})();`,
      }}
    />
  );
}
