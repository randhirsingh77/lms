import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePasswordMutation } from "@/features/api/authApi";
import { ArrowLeft, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader, PageShell } from "@/components/SiteUI";

// Dedicated change-password screen (linked from Profile as "Reset
// Password"). Same verified flow as before — current → new → confirm,
// the server re-checks the current password with bcrypt and the hourly
// rate limit is unchanged. It renders in the normal site shell like
// every other signed-in page (it used to sit in the logged-out auth
// shell, which made a signed-in user look logged out).
const ChangePassword = () => {
  const [fields, setFields] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const navigate = useNavigate();

  const changeHandler = (e) => {
    const { name, value } = e.target;
    setFields({ ...fields, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fields.newPassword.length < 8 || fields.newPassword.length > 128) {
      toast.error("New password must be between 8 and 128 characters.");
      return;
    }
    if (fields.newPassword !== fields.confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }
    if (fields.newPassword === fields.currentPassword) {
      toast.error("New password must be different from the current password.");
      return;
    }
    try {
      const data = await changePassword({
        currentPassword: fields.currentPassword,
        newPassword: fields.newPassword,
      }).unwrap();
      toast.success(data.message || "Password changed successfully.");
      setFields({ currentPassword: "", newPassword: "", confirmPassword: "" });
      navigate("/profile");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to change password.");
    }
  };

  return (
    <PageShell className="py-10">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <PageHeader
          title="Reset password"
          description="Verify your current password, then choose a new one."
        />
        <Card className="shadow-sm">
          <CardHeader className="sr-only">
            <CardTitle>Reset password</CardTitle>
            <CardDescription>
              Verify your current password, then choose a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                value={fields.currentPassword}
                onChange={changeHandler}
                placeholder="Your current password"
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                name="newPassword"
                autoComplete="new-password"
                value={fields.newPassword}
                onChange={changeHandler}
                placeholder="At least 8 characters"
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                value={fields.confirmPassword}
                onChange={changeHandler}
                placeholder="Type it again"
                required
                className="h-11"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              We&apos;ll verify your current password before changing it.
              The new password must be different from the current one.
            </p>
            <Button type="submit" disabled={isLoading} className="h-11 w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait
                </>
              ) : (
                "Change password"
              )}
            </Button>
            <Button asChild variant="ghost" className="h-10 w-full">
              <Link to="/profile">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to profile
              </Link>
            </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
};

export default ChangePassword;
