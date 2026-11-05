import { dictionary } from "@/lib/dictionary";
import it from "@/messages/it/account.json";
import enMessages from "@/messages/en/account.json";
import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { AccountAuthForm } from "./auth-form";

export function AccountAuthPage({ locale, mode, token, callbackUrl, verification }: { locale: string; mode: "login" | "register" | "password-reset" | "verify-resend"; token?: string; callbackUrl?: string; verification?: string }) {
  const t = dictionary(locale, it, enMessages).authPage;
  const title = mode === "login" ? (t.welcomeBack) : mode === "register" ? (t.joinTheCommunity) : mode === "verify-resend" ? (t.verifyYourEmail) : token ? (t.chooseANewPassword) : (t.forgotYourPassword);
  const description = mode === "login" ? (t.signInToManageYourEvents) : mode === "register" ? (t.createAnAccountToSubmitAndFollow) : mode === "verify-resend" ? (t.enterYourEmailToRequestAnotherVerification) : token ? (t.enterAndConfirmYourNewPassword) : (t.enterYourEmailToReceiveAReset);
  const verified = verification === "success" ? (t.emailVerifiedYouCanSignIn) : verification ? (t.verificationLinkInvalidOrExpiredRequestAnother) : "";
  return <main className="grid min-h-[76vh] place-items-center bg-[#f6f7f4] px-5 py-12"><div className="w-full max-w-[450px]"><Link href={`/${locale}`} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted"><ArrowLeft size={15} /> {t.backToSardiniafestival}</Link><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(8,40,72,.08)] md:p-9"><span className="flex size-11 items-center justify-center rounded-2xl bg-[#e7f5f2] text-sea"><Compass size={21} /></span><h1 className="mt-5 font-display text-3xl font-semibold tracking-[-.04em] text-ink">{title}</h1><p className="mt-2 text-sm text-muted">{description}</p>{verified && <p role="status" className="mt-4 rounded-xl bg-[#e7f5f2] p-3 text-sm">{verified}</p>}<div className="mt-7"><AccountAuthForm locale={locale} mode={mode} token={token} callbackUrl={callbackUrl} /></div>{mode === "login" && <div className="mt-5 space-y-3 text-center text-sm text-muted"><p><Link className="font-bold text-sea" href={`/${locale}/auth/password-reset`}>{t.forgotYourPassword2}</Link></p><p><Link className="font-bold text-sea" href={`/${locale}/auth/verify-resend`}>{t.resendVerificationEmail}</Link></p><p>{t.noAccount}<Link className="font-bold text-sea" href={`/${locale}/auth/register`}>{t.register}</Link></p></div>}{mode === "register" && <p className="mt-5 text-center text-sm text-muted">{t.alreadyRegistered}<Link className="font-bold text-sea" href={`/${locale}/auth/login`}>{t.signIn}</Link></p>}</div></div></main>;
}
