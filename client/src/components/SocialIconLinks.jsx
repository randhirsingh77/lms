import { Github, Globe, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

// Student-facing social links: ICON buttons only, never the raw URL —
// the instructor's public page and course pages link out through these.
// The payloads this receives are already privacy-filtered on the server
// (a private or empty link is simply absent), so whatever is present
// here is meant to be shown.
export const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "youtube", label: "YouTube", Icon: Youtube },
  { key: "twitter", label: "Twitter / X", Icon: Twitter },
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin },
  { key: "github", label: "GitHub", Icon: Github },
  { key: "website", label: "Website", Icon: Globe },
];

const SocialIconLinks = ({ socialLinks, className, linkClassName }) => {
  const present = SOCIAL_PLATFORMS.filter((p) => socialLinks?.[p.key]);
  if (present.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {present.map((platform) => {
        const PlatformIcon = platform.Icon;
        return (
          <a
            key={platform.key}
            href={socialLinks[platform.key]}
            target="_blank"
            rel="noreferrer"
            aria-label={`${platform.label} profile`}
            title={platform.label}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              linkClassName
            )}
          >
            <PlatformIcon className="h-4 w-4" />
          </a>
        );
      })}
    </div>
  );
};

export default SocialIconLinks;
