import { Geist, Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";
import StoreProvider from "@/store/StoreProvider";

const inter = Inter({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata = {
  title: "DailyForge",
  description: "Your life, beautifully organized.",
  icons: {
    icon: "/images/favicon_io/favicon.ico",
    shortcut: "/images/favicon_io/favicon-16x16.png",
    apple: "/images/favicon_io/apple-touch-icon.png",
  },
  manifest: "/images/favicon_io/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <StoreProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            {children}
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  )
}
