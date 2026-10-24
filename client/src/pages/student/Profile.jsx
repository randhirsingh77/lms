import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import CourseCard from "@/components/CourseCard";
import {
  EmptyState,
  PageHeader,
  PageShell,
  SectionHeader,
} from "@/components/SiteUI";
import {
  useChangePasswordMutation,
  useLoadUserQuery,
  useUpdateUserMutation,
} from "@/features/api/authApi";
import { BookOpen, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

const initialsOf = (name) =>
  (name || "?")
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

const Profile = () => {
  const [name, setName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");

  const { data, isLoading, refetch } = useLoadUserQuery();
  const [
    updateUser,
    {
      data: updateUserData,
      isLoading: updateUserIsLoading,
      isError,
      error,
      isSuccess,
    },
  ] = useUpdateUserMutation();

  const onChangeHandler = (e) => {
    const file = e.target.files?.[0];
    if (file) setProfilePhoto(file);
  };

  const updateUserHandler = async () => {
    const formData = new FormData();
    formData.append("name", name);
    // Only append the photo when a file was actually picked. Appending the
    // initial "" sent a text field instead of a file, and the server then
    // crashed trying to upload it — name-only edits always failed.
    if (profilePhoto instanceof File) {
      formData.append("profilePhoto", profilePhoto);
    }
    await updateUser(formData);
  };

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Pre-fill the edit form with the current name instead of an empty box.
  useEffect(() => {
    if (data?.user?.name) {
      setName(data.user.name);
    }
  }, [data?.user?._id, data?.user?.name]);

  useEffect(() => {
    if (isSuccess) {
      refetch();
      toast.success(updateUserData?.message || "Profile updated.");
    }
    if (isError) {
      toast.error(error?.data?.message || "Failed to update profile");
    }
  }, [error, updateUserData, isSuccess, isError, refetch]);

  if (isLoading) {
    return (
      <PageShell className="py-10">
        <Skeleton className="mb-8 h-9 w-48" />
        <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr]">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageShell>
    );
  }

  const user = data?.user;
  if (!user) {
    return (
      <PageShell className="py-10">
        <EmptyState
          title="Profile unavailable"
          description="We couldn't load your profile. Please try again."
          action={
            <Button onClick={() => refetch()} className="h-10">
              Retry
            </Button>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="py-10">
      <PageHeader
        title="Profile"
        description="Your account details, security and enrolled courses."
        className="mb-8"
      />
      <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.photoUrl || undefined} alt="" />
              <AvatarFallback className="text-xl">
                {initialsOf(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-lg font-semibold">{user.name}</p>
              <p className="break-all text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {user.role}
            </Badge>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="mt-2 h-10 w-full">Edit Profile</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                  <DialogDescription>
                    Make changes to your profile here. Click save when
                    you&apos;re done.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="profile-name">Name</Label>
                    <Input
                      id="profile-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Name"
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="profile-photo">Profile Photo</Label>
                    <Input
                      id="profile-photo"
                      onChange={onChangeHandler}
                      type="file"
                      accept="image/*"
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button disabled={updateUserIsLoading} onClick={updateUserHandler}>
                    {updateUserIsLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please
                        wait
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-10">
          <ChangePasswordCard />
          <section>
            <SectionHeader
              title="Courses you're enrolled in"
              className="mb-6"
            />
            {user.enrolledCourses.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No enrollments yet"
                description="You haven't enrolled in any course yet."
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {user.enrolledCourses.map((course) => (
                  <CourseCard course={course} key={course._id} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  );
};

export default Profile;

// Change password (logged-in): current → new → confirm. Client checks
// are UX only — matching, length and "different from current" — the
// server re-verifies the current password with bcrypt and stays the
// authority; its message is what the toast shows.
const ChangePasswordCard = () => {
  const [fields, setFields] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changePassword, { isLoading }] = useChangePasswordMutation();

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
    } catch (err) {
      toast.error(err?.data?.message || "Failed to change password.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
      </CardHeader>
      <CardContent>
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
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            We&apos;ll verify your current password before changing it. The
            new password must be different from the current one.
          </p>
          <Button type="submit" disabled={isLoading} className="h-11">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait
              </>
            ) : (
              "Change password"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
