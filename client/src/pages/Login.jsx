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
import { useLoginUserMutation } from "@/features/api/authApi";
import { landingPathFor } from "@/lib/landing";
import { Loader2 } from "lucide-react";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AuthLayout from "./auth/AuthLayout";

// Login ONLY — signup lives on its own screen (/signup). The submit
// handler awaits the mutation and reacts to THAT result directly; the
// old shared useEffect over both mutations' state is what re-fired the
// stale "Account created successfully." toast when logging in after a
// signup.
const Login = () => {
  const [input, setInput] = useState({ email: "", password: "" });
  const [loginUser, { isLoading }] = useLoginUserMutation();
  const navigate = useNavigate();

  const changeHandler = (e) => {
    const { name, value } = e.target;
    setInput({ ...input, [name]: value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const data = await loginUser(input).unwrap();
      toast.success(`Welcome back, ${data.user.name}`);
      navigate(landingPathFor(data.user), { replace: true });
    } catch (err) {
      toast.error(err?.data?.message || "Login failed. Please try again.");
    }
  };

  return (
    <AuthLayout>
      <Card className="shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Log in to continue learning — or teaching.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                value={input.email}
                onChange={changeHandler}
                placeholder="Eg. randhir@gmail.com"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="login-password"
                type="password"
                name="password"
                autoComplete="current-password"
                value={input.password}
                onChange={changeHandler}
                placeholder="Your password"
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
                "Login"
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              New to E-Learning?{" "}
              <Link
                to="/signup"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Create an account
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </AuthLayout>
  );
};

export default Login;
