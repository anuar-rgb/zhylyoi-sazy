import { isInstitutionDomain } from "@/lib/platform";

/**
 * Asked by the web server (Caddy, on_demand_tls) before it obtains an HTTPS certificate for a
 * domain it has not seen: yes only for an institution's domain (or its www.). Without this, anyone
 * could point a domain at the server and have it request certificates in their name.
 */
export async function GET(request: Request) {
  const domain = new URL(request.url).searchParams.get("domain");
  return (await isInstitutionDomain(domain)) ? new Response("ok") : new Response("unknown domain", { status: 404 });
}
