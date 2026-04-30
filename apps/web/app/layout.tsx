import { Geist_Mono, Inter } from "next/font/google"
import { Toaster } from "react-hot-toast"
import { SessionProvider } from "next-auth/react"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import StoreProvider from "@/store/StoreProvider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { TRPCProvider } from "@/components/providers/trpc-provider"
import { auth } from "@/auth"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body suppressHydrationWarning>
        <SessionProvider session={session}>
          <StoreProvider>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
              <TooltipProvider>
                <TRPCProvider>
                  {children}
                  <Toaster position="top-center" />
                </TRPCProvider>
              </TooltipProvider>
            </ThemeProvider>
          </StoreProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
