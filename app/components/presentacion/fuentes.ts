/* Tipografías de Distinto para la presentación (las mismas del sitio). */
import { Fredoka, Montserrat } from "next/font/google";

export const display = Fredoka({ subsets: ["latin"], weight: ["500", "600"], variable: "--pr-display" });
export const sans = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--pr-sans" });
