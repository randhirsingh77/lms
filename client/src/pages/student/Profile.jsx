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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import CourseCard from "@/components/CourseCard";
import { SOCIAL_PLATFORMS } from "@/components/SocialIconLinks";
import {
  EmptyState,
  PageHeader,
  PageShell,
  SectionHeader,
} from "@/components/SiteUI";
import {
  useLoadUserQuery,
  useUpdatePublicProfileSettingsMutation,
  useUpdateUserMutation,
} from "@/features/api/authApi";
import {
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Eye,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Mail,
  Phone,
  Share2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const initialsOf = (name) =>
  (name || "?")
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

const DEFAULT_SOCIALS = {
  instagram: "",
  youtube: "",
  twitter: "",
  linkedin: "",
  github: "",
  website: "",
};
const DEFAULT_FIELD_PRIVACY = { email: "private", phone: "private", bio: "public" };
const DEFAULT_SOCIAL_PRIVACY = {
  instagram: "public",
  youtube: "public",
  twitter: "public",
  linkedin: "public",
  github: "public",
  website: "public",
};

const PrivacySwitch = ({ id, label, value, onChange, hint }) => (
  <div className="flex items-center justify-between gap-4 py-1">
    <div className="min-w-0">
      <Label htmlFor={id} className="cursor-pointer">
        {label}
      </Label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
    <div className="flex shrink-0 items-center gap-2">
      <span className="w-14 text-right text-xs font-medium text-muted-foreground">
        {value === "public" ? "Public" : "Private"}
      </span>
      <Switch
        id={id}
        checked={value === "public"}
        onCheckedChange={(checked) => onChange(checked ? "public" : "private")}
      />
    </div>
  </div>
);

const Profile = () => {
  const { data, isLoading, refetch } = useLoadUserQuery();
  const [updateUser, { isLoading: isSaving }] = useUpdateUserMutation();
  const [updatePublicProfileSettings, { isLoading: isSavingPublicProfile }] =
    useUpdatePublicProfileSettingsMutation();
  const [copiedLink, setCopiedLink] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [socialLinks, setSocialLinks] = useState(DEFAULT_SOCIALS);
  const [fieldPrivacy, setFieldPrivacy] = useState(DEFAULT_FIELD_PRIVACY);
  const [socialPrivacy, setSocialPrivacy] = useState(DEFAULT_SOCIAL_PRIVACY);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const user = data?.user;

  // Pre-fill the edit form from the loaded profile (the old form opened
  // with an empty name box; the richer fields need the same treatment).
  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    setPhone(user.phone || "");
    setBio(user.bio || "");
    setSocialLinks({ ...DEFAULT_SOCIALS, ...(user.socialLinks || {}) });
    setFieldPrivacy({ ...DEFAULT_FIELD_PRIVACY, ...(user.fieldPrivacy || {}) });
    setSocialPrivacy({ ...DEFAULT_SOCIAL_PRIVACY, ...(user.socialPrivacy || {}) });
  }, [user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setProfilePhoto(file);
  };

  const updateUserHandler = async () => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("phone", phone);
    formData.append("bio", bio);
    if (user?.role === "instructor") {
      // Objects travel as JSON strings inside the multipart form; the
      // server parses and whitelist-validates them.
      formData.append("socialLinks", JSON.stringify(socialLinks));
      formData.append("fieldPrivacy", JSON.stringify(fieldPrivacy));
      formData.append("socialPrivacy", JSON.stringify(socialPrivacy));
    }
    // Only append the photo when a file was actually picked — appending
    // the initial "" sent a text field the server tried to upload.
    if (profilePhoto instanceof File) {
      formData.append("profilePhoto", profilePhoto);
    }
    try {
      const res = await updateUser(formData).unwrap();
      toast.success(res?.message || "Profile updated.");
      setEditOpen(false);
      setProfilePhoto("");
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update profile");
    }
  };

  if (isLoading) {
    return (
      <PageShell className="py-10">
        <Skeleton className="mb-8 h-9 w-48" />
        <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageShell>
    );
  }

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

  const publicProfile = {
    enabled: false,
    slug: null,
    showScores: true,
    ...(user.publicProfile || {}),
  };
  const publicProfileUrl = publicProfile.slug
    ? `${window.location.origin}/u/${publicProfile.slug}`
    : null;

  const handlePublicProfileChange = async (patch) => {
    try {
      await updatePublicProfileSettings(patch).unwrap();
      toast.success("Public profile settings updated.");
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update public profile");
    }
  };

  const handleCopyPublicLink = async () => {
    if (!publicProfileUrl) return;
    try {
      await navigator.clipboard.writeText(publicProfileUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Couldn't copy — copy the link manually.");
    }
  };

  const isInstructor = user.role === "instructor";
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : null;
  const privacyChip = (field) =>
    isInstructor ? (
      <Badge variant="outline" className="ml-2 text-[11px] font-normal">
        {user.fieldPrivacy?.[field] === "public" ? "Public" : "Private"}
      </Badge>
    ) : null;

  return (
    <PageShell className="py-10">
      <PageHeader
        title="Profile"
        description="Your account details, public instructor page and enrolled courses."
        className="mb-8"
      />
      <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-6">
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
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {user.role}
                </Badge>
                {memberSince ? (
                  <span className="text-xs text-muted-foreground">
                    Member since {memberSince}
                  </span>
                ) : null}
              </div>
              <Button className="mt-2 h-10 w-full" onClick={() => setEditOpen(true)}>
                Edit Profile
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pb-4">
              <Link
                to="/change-password"
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
              >
                <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium">Reset Password</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              {isInstructor ? (
                <>
                  <Link
                    to="/admin/dashboard"
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
                  >
                    <LayoutDashboard className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium">Instructor dashboard</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                  <Link
                    to={`/instructor/${user._id}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
                  >
                    <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium">View public profile</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </>
              ) : (
                <Link
                  to="/my-learning"
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
                >
                  <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-sm font-medium">My learning</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Share2 className="h-4 w-4" /> Public skill profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-5">
              <p className="text-sm text-muted-foreground">
                A shareable page with your completed courses, verified
                certificates and learning streak. It is off by default and
                never shows your email or phone number.
              </p>
              <div className="flex items-center justify-between gap-4 py-1">
                <Label htmlFor="public-profile-enabled" className="cursor-pointer">
                  Share my skill profile
                </Label>
                <Switch
                  id="public-profile-enabled"
                  checked={publicProfile.enabled}
                  disabled={isSavingPublicProfile}
                  onCheckedChange={(checked) =>
                    handlePublicProfileChange({ enabled: checked })
                  }
                />
              </div>
              {publicProfile.enabled ? (
                <>
                  <div className="flex items-center justify-between gap-4 py-1">
                    <Label htmlFor="public-profile-scores" className="cursor-pointer">
                      Show quiz scores
                    </Label>
                    <Switch
                      id="public-profile-scores"
                      checked={publicProfile.showScores}
                      disabled={isSavingPublicProfile}
                      onCheckedChange={(checked) =>
                        handlePublicProfileChange({ showScores: checked })
                      }
                    />
                  </div>
                  {publicProfileUrl ? (
                    <div className="space-y-2 pt-1">
                      <p className="break-all rounded-md bg-accent/60 px-3 py-2 text-xs">
                        {publicProfileUrl}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-9 flex-1"
                          onClick={handleCopyPublicLink}
                        >
                          {copiedLink ? (
                            <>
                              <Check className="mr-1.5 h-4 w-4" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="mr-1.5 h-4 w-4" /> Copy link
                            </>
                          )}
                        </Button>
                        <Button asChild size="sm" variant="outline" className="h-9 flex-1">
                          <Link to={`/u/${publicProfile.slug}`}>View page</Link>
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-10">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-6">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email {privacyChip("email")}
                  </p>
                  <p className="break-all text-sm">{user.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Mobile {privacyChip("phone")}
                  </p>
                  <p className="text-sm">
                    {user.phone || (
                      <span className="text-muted-foreground">Not added yet</span>
                    )}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Profile summary {privacyChip("bio")}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">
                  {user.bio || (
                    <span className="text-muted-foreground">
                      No summary yet — add one from Edit Profile.
                    </span>
                  )}
                </p>
              </div>
              {isInstructor ? (
                <p className="text-xs text-muted-foreground">
                  Public / Private controls what visitors see on your public
                  instructor page. Private fields are never sent to visitors
                  at all.
                </p>
              ) : null}
            </CardContent>
          </Card>

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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when
              you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
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
              <Label htmlFor="profile-phone">Mobile</Label>
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="profile-bio" className="pt-2">
                Summary
              </Label>
              <textarea
                id="profile-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A few lines about you — shown on your public profile if you're an instructor."
                maxLength={1000}
                rows={4}
                className="col-span-3 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="profile-photo">Profile Photo</Label>
              <Input
                id="profile-photo"
                onChange={onPhotoChange}
                type="file"
                accept="image/*"
                className="col-span-3"
              />
            </div>

            {isInstructor ? (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Social links</p>
                  <p className="text-xs text-muted-foreground">
                    Paste the full link (starting with https://). Students
                    see icon buttons only, and only for links set to Public.
                  </p>
                </div>
                {SOCIAL_PLATFORMS.map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor={`social-${key}`}>{label}</Label>
                      <Input
                        id={`social-${key}`}
                        type="url"
                        value={socialLinks[key]}
                        onChange={(e) =>
                          setSocialLinks({ ...socialLinks, [key]: e.target.value })
                        }
                        placeholder={`https://…`}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <span />
                      <div className="col-span-3">
                        <PrivacySwitch
                          id={`social-${key}-privacy`}
                          label={`${label} visibility`}
                          value={socialPrivacy[key]}
                          onChange={(v) =>
                            setSocialPrivacy({ ...socialPrivacy, [key]: v })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Public profile privacy</p>
                  <p className="text-xs text-muted-foreground">
                    Choose what visitors to your instructor page can see.
                  </p>
                </div>
                <PrivacySwitch
                  id="privacy-email"
                  label="Email address"
                  value={fieldPrivacy.email}
                  onChange={(v) => setFieldPrivacy({ ...fieldPrivacy, email: v })}
                />
                <PrivacySwitch
                  id="privacy-phone"
                  label="Mobile number"
                  value={fieldPrivacy.phone}
                  onChange={(v) => setFieldPrivacy({ ...fieldPrivacy, phone: v })}
                />
                <PrivacySwitch
                  id="privacy-bio"
                  label="Profile summary"
                  value={fieldPrivacy.bio}
                  onChange={(v) => setFieldPrivacy({ ...fieldPrivacy, bio: v })}
                />
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button disabled={isSaving} onClick={updateUserHandler}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default Profile;
