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
import { useResetPasswordMutation } from "@/features/api/authApi";
import { Link2Off, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AuthLayout from "./auth/AuthLayout";

// Reset password: the emailed link lands here with ?token=... The token
// is single-use and expires after 30 minutes (server-side); this screen
// only collects and confirms the new password. The server stays the
// authority — its error message is what gets toasted.
const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [input, setInput] = useState({ newPassword: "", confirmPassword: "" });
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const navigate = useNavigate();

  const changeHandler = (e) => {
    const { name, value } = e.target;
    setInput({ ...input, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (input.newPassword.length < 8 || input.newPassword.length > 128) {
      toast.error("Password must be between 8 and 128 characters.");
      return;
    }
    if (input.newPassword !== input.confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }
    try {
      const data = await resetPassword({
        token,
        newPassword: input.newPassword,
      }).unwrap();
      toast.success(data.message || "Password reset. Please log in.");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(
        err?.data?.message ||
          "This reset link is invalid or has expired. Please request a new one."
      );
    }
  };

  if (!token) {
    return (
      <AuthLayout>
        <Card className="shadow-sm">
          <CardHeader className="space-y-1">
            <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-muted">
              <Link2Off className="h-5 w-5 text-muted-foreground" />
            </span>
            <CardTitle className="text-2xl">This link isn&apos;t valid</CardTitle>
            <CardDescription>
              The reset link is missing its token. Request a fresh link and
              open it from your email.
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-2">
            <Button asChild className="h-11 w-full">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          </CardFooter>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card className="shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Set a new password</CardTitle>
          <CardDescription>
            Choose a new password for your account. This link can be used
            once.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-new-password">New password</Label>
              <Input
                id="reset-new-password"
                type="password"
                name="newPassword"
                autoComplete="new-password"
                value={input.newPassword}
                onChange={changeHandler}
                placeholder="At least 8 characters"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirm-password">Confirm new password</Label>
              <Input
                id="reset-confirm-password"
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                value={input.confirmPassword}
                onChange={changeHandler}
                placeholder="Type it again"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4 pt-2">
            <Button type="submit" disabled={isLoading} className="h-11 w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait
                </>
              ) : (
                "Reset password"
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              Back to{" "}
              <Link
                to="/login"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </AuthLayout>
  );
};

export default ResetPassword;
