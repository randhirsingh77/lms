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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRegisterUserMutation } from "@/features/api/authApi";
import { landingPathFor } from "@/lib/landing";
import { Loader2 } from "lucide-react";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AuthLayout from "./auth/AuthLayout";

// Signup ONLY — its own screen (/signup), separate from /login. The
// server now sets the session cookie on register too, so a successful
// signup lands the new user straight on their role's home (instructor →
// dashboard, student → my learning) with one welcome toast.
const Signup = () => {
  const [input, setInput] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });
  const [registerUser, { isLoading }] = useRegisterUserMutation();
  const navigate = useNavigate();

  const changeHandler = (e) => {
    const { name, value } = e.target;
    setInput({ ...input, [name]: value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const data = await registerUser(input).unwrap();
      toast.success(`Welcome, ${data.user.name}`);
      navigate(landingPathFor(data.user), { replace: true });
    } catch (err) {
      toast.error(err?.data?.message || "Signup failed. Please try again.");
    }
  };

  return (
    <AuthLayout>
      <Card className="shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>
            Sign up as a student or an instructor — it takes a moment.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-name">Name</Label>
              <Input
                id="signup-name"
                type="text"
                name="name"
                autoComplete="name"
                value={input.name}
                onChange={changeHandler}
                placeholder="Eg. randhir"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
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
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                name="password"
                autoComplete="new-password"
                value={input.password}
                onChange={changeHandler}
                placeholder="At least 8 characters"
                required
              />
              <p className="text-xs text-muted-foreground">
                Use at least 8 characters.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-role">I am joining as</Label>
              <Select
                value={input.role}
                onValueChange={(value) => setInput({ ...input, role: value })}
              >
                <SelectTrigger id="signup-role" className="h-11 w-full">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="instructor">Instructor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4 pt-2">
            <Button type="submit" disabled={isLoading} className="h-11 w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait
                </>
              ) : (
                "Create account"
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Log in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </AuthLayout>
  );
};

export default Signup;
