import { useEffect, useState } from "react";
import { ShieldCheck, Smartphone, Mail, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PendingVerification = {
  title: string;
  detail: string;
  code: string;
  channel: "sms" | "email";
  onVerified: () => void;
};

export function OTPVerificationModal({
  request,
  onClose,
}: {
  request: PendingVerification | null;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setValue("");
    setError(false);
    setChecking(false);
  }, [request]);

  const submit = () => {
    if (!request || value.length < 6) return;
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      if (value === request.code) {
        request.onVerified();
        onClose();
      } else {
        setError(true);
        setValue("");
      }
    }, 550);
  };

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-border bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <ShieldCheck className="h-4 w-4 text-primary" /> Verify it's really you
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {request?.title} is a high-risk action. We sent a 6-digit code
            {request?.channel === "email" ? " to the email on file" : " by SMS to the phone on file"}.
          </DialogDescription>
        </DialogHeader>

        <div className="panel-inset flex items-center gap-2 p-3 text-[11px] text-muted-foreground">
          {request?.channel === "email" ? <Mail className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
          {request?.detail}
        </div>

        <div className="flex flex-col items-center gap-3 py-2">
          <InputOTP maxLength={6} value={value} onChange={(v) => { setValue(v); setError(false); }}>
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} className={cn(error && "border-destructive text-destructive")} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {error ? (
            <p className="text-xs text-destructive">That code isn't right. Try again.</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Demo passcode: <span className="font-mono text-primary">{request?.code}</span>
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onClose} className="text-xs">
            Cancel action
          </Button>
          <Button onClick={submit} disabled={value.length < 6 || checking} className="text-xs">
            {checking && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
            Verify & execute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
