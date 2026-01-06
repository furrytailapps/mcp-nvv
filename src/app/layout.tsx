import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NVV MCP Server",
  description: "MCP server for Naturvårdsverket protected areas API",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
