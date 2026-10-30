import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Award, CheckCircle2, Linkedin, Printer, ShieldAlert } from "lucide-react";
import { api, apiUrl, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { date } from "@/lib/format";
import { Button, Spinner } from "@/components/ui";

interface Verification {
  credentialCode: string;
  recipientName: string;
  courseTitle: string;
  issuerName: string;
  issuedAt: string;
  expiresAt?: string;
  scorePercent?: number;
  state: "valid" | "revoked" | "expired";
  /** Issued by a verified vendor partner; the certificate is co-branded with the platform. */
  issuerPartner?: boolean;
}

/** Public credential page: printable certificate plus verification status. */
export function Verify() {
  const { code } = useParams();
  const { me } = useAuth();
  const v = useQuery({ queryKey: ["verify", code], queryFn: () => api<Verification>(`/certificates/${code}/verify`), retry: false });
  const mine = useQuery({
    queryKey: ["certificates"],
    queryFn: () => api<{ id: string; credentialCode: string }[]>("/me/certificates"),
    enabled: !!me,
  });
  const owned = mine.data?.find((c) => c.credentialCode === code);
  const share = useMutation({
    mutationFn: () => post<{ addToProfileUrl: string; shareUrl: string }>(`/certificates/${owned!.id}/share`),
  });

  if (v.isLoading) return <Spinner />;
  if (!v.data)
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-500" aria-hidden />
        <h1 className="mt-3 text-xl font-semibold">Credential not found</h1>
        <p className="mt-1 text-ink-mute">No certificate matches “{code}”. Check the code and try again.</p>
      </div>
    );

  const c = v.data;
  const valid = c.state === "valid";

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl">
        <div className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium print:hidden ${valid ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
          {valid ? <CheckCircle2 className="h-5 w-5" aria-hidden /> : <ShieldAlert className="h-5 w-5" aria-hidden />}
          {valid ? `Verified: this credential was issued by ${c.issuerName}${c.issuerPartner ? " in partnership with TMS Learning" : ""} and is valid.` : `This credential is ${c.state}.`}
        </div>

        <div className="relative overflow-hidden rounded-2xl border-8 border-double border-brand-200 bg-white px-8 py-12 text-center shadow-sm sm:px-16">
          <Award className="mx-auto h-14 w-14 text-amber-500" aria-hidden />
          <p className="mt-4 text-sm font-medium uppercase tracking-[0.25em] text-ink-mute">Certificate of completion</p>
          {c.issuerPartner && <p className="mt-2 text-sm font-semibold text-ink-soft">{c.issuerName} <span className="font-normal text-ink-mute">×</span> TMS Learning</p>}
          <p className="mt-8 text-ink-mute">This certifies that</p>
          <p className="mt-2 font-serif text-4xl text-ink">{c.recipientName}</p>
          <p className="mt-6 text-ink-mute">has successfully completed</p>
          <p className="mt-2 text-2xl font-semibold text-brand-800">{c.courseTitle}</p>
          {c.scorePercent != null && <p className="mt-2 text-sm text-ink-mute">with an assessment score of {c.scorePercent}%</p>}
          <div className="mt-10 grid items-end gap-6 text-sm sm:grid-cols-3">
            <div>
              <div className="border-t border-slate-300 pt-2 font-medium">{c.issuerName}</div>
              <div className="text-ink-mute">{c.issuerPartner ? "Issuing partner · with TMS Learning" : "Issuer"}</div>
            </div>
            <img src={apiUrl(`/certificates/${c.credentialCode}/qr.png`)} alt="QR code linking to this verification page" className="mx-auto h-28 w-28" />
            <div>
              <div className="border-t border-slate-300 pt-2 font-medium">{date(c.issuedAt)}</div>
              <div className="text-ink-mute">Issued{c.expiresAt && ` · valid until ${date(c.expiresAt)}`}</div>
            </div>
          </div>
          <p className="mt-8 font-mono text-xs text-ink-mute">Credential ID {c.credentialCode}</p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 print:hidden">
          <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden /> Print or save as PDF</Button>
          {owned && valid && (
            share.data ? (
              <>
                <a href={share.data.addToProfileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#0a66c2] px-4 py-2 text-sm font-medium text-white">
                  <Linkedin className="h-4 w-4" aria-hidden /> Add to LinkedIn profile
                </a>
                <a href={share.data.shareUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-[#0a66c2] px-4 py-2 text-sm font-medium text-[#0a66c2]">
                  Share as a post
                </a>
              </>
            ) : (
              <Button loading={share.isPending} onClick={() => share.mutate()}><Linkedin className="h-4 w-4" aria-hidden /> Share on LinkedIn</Button>
            )
          )}
          <Link to="/" className="text-sm text-ink-mute hover:underline">TMS Learning</Link>
        </div>
      </div>
    </div>
  );
}
