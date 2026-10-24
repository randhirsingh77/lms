import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPasswordMutation } from "@/features/api/authApi";
import { Loader2, MailCheck } from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AuthLayout from "./auth/AuthLayout";

// Forgot password: ask for the email, then show the SAME confirmation
// the server gives everyone — the page never reveals whether the email
// belongs to an account (the server endpoint is enumeration-safe too).
const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState(null);
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await forgotPassword({ email }).unwrap();
      setSubmittedEmail(email);
    } catch (err) {
      toast.error(
        err?.data?.message || "Something went wrong. Please try again."
      );
    }
  };

  return (
    <AuthLayout>
      <Card className="shadow-sm">
        {submittedEmail ? (
          <>
            <CardHeader className="space-y-1">
              <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                <MailCheck className="h-5 w-5 text-muted-foreground" />
              </span>
              <CardTitle className="text-2xl">Check your email</CardTitle>
              <CardDescription>
                If an account exists for{" "}
                <span className="font-medium text-foreground">
                  {submittedEmail}
                </span>
                , a password reset link is on its way. The link expires in
                30 minutes and can be used once.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex-col gap-3 pt-2">
              <Button asChild className="h-11 w-full">
                <Link to="/login">Back to login</Link>
              </Button>
              <button
                type="button"
                onClick={() => setSubmittedEmail(null)}
                className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Use a different email
              </button>
            </CardFooter>
          </>
        ) : (
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Forgot your password?</CardTitle>
              <CardDescription>
                Enter your account email and we&apos;ll send you a link to
                reset it.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Eg. randhir@gmail.com"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-4 pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please
                      wait
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Remembered it?{" "}
                  <Link
                    to="/login"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Back to login
                  </Link>
                </p>
              </CardFooter>
            </form>
          </>
        )}
      </Card>
    </AuthLayout>
  );
};

export default ForgotPassword;
