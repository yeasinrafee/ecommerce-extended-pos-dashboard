// "use server";

// import { headers } from "next/headers";
// import baseUrl from "@/routes/index";

// const resolveAppOrigin = async () => {
//   const headerStore = await headers();
//   const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");

//   if (!host) {
//     throw new Error("Failed to resolve request host");
//   }

//   const protocol = headerStore.get("x-forwarded-proto") ?? "http";
//   return `${protocol}://${host}`;
// };

// export async function logoutAction() {
//   const origin = await resolveAppOrigin();

//   const response = await fetch(`${origin}${baseUrl}/auth/logout`, {
//     method: "POST",
//     cache: "no-store"
//   });

//   if (!response.ok) {
//     throw new Error("Failed to log out");
//   }
// }
