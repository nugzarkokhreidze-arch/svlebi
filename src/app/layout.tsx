import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "სვლები — სტრატეგიული თამაში პოლიტიკის შესახებ",
  description:
    "სვლები არის ონლაინ სტრატეგიული თამაში პოლიტიკური არჩევანების, ალიანსების, მოლაპარაკებებისა და შედეგების შესახებ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ka">
      <body>{children}</body>
    </html>
  );
}
