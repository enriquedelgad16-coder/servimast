import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function validarCedulaRD(cedula: string): boolean {
  const cleaned = cedula.replace(/[-\s]/g, "");
  if (cleaned.length !== 11 || !/^\d{11}$/.test(cleaned)) return false;
  const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let product = parseInt(cleaned[i]) * weights[i];
    if (product >= 10) product = Math.floor(product / 10) + (product % 10);
    sum += product;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(cleaned[10]);
}

export function formatCedula(cedula: string): string {
  const cleaned = cedula.replace(/[-\s]/g, "");
  if (cleaned.length !== 11) return cedula;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 10)}-${cleaned.slice(10)}`;
}

export function generateNumeroComprobante(
  year: number,
  quincenaNum: number,
  empleadoNum: string
): string {
  const q = String(quincenaNum).padStart(2, "0");
  return `REC-${year}-${q}-${empleadoNum}`;
}
