import type { Metadata } from "next"
import "@/index.css"

export const metadata: Metadata = {
  title: "HARB Admin Dashboard",
  robots: { index: false },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-full">{children}</div>
      </body>
    </html>
  )
}
