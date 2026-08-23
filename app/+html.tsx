import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';
import { color } from '../design';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/chapters/manifest.webmanifest" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/chapters/icons/apple-touch-icon.png" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content={color.neutrals.paper} />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content={color.darkGround[900]} />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* viewport-fit=cover extends the viewport under the home indicator, and whatever
                 no element paints falls through to the canvas — which the browser takes from
                 html's background and otherwise renders white. React Native Web paints the theme
                 inside the app tree only, so without this the strip below the app was a white bar
                 on a dark page. color-scheme additionally stops the UA painting its own surfaces
                 (overscroll, scrollbars, form controls) as light. */
              html {
                background: ${color.neutrals.paper};
                color-scheme: light dark;
              }
              @media (prefers-color-scheme: dark) {
                html { background: ${color.darkGround[900]}; }
              }
              html, body, #root { height: 100%; }
              body { overscroll-behavior: none; }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/chapters/sw.js', { scope: '/chapters/' }).catch(function() {});
                });
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
