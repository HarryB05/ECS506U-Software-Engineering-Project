import { Geist } from "next/font/google";
import { DM_Serif_Display } from "next/font/google";

export const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});
