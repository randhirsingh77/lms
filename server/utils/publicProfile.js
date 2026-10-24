// What the public may see of an instructor — ONE definition shared by the
// public instructor endpoint and the course-detail payload, so the two
// can never drift apart. Privacy is applied here, on the server: a link
// marked private (or absent) is simply never copied into the result.
export const SOCIAL_KEYS = ["instagram", "youtube", "twitter", "linkedin", "github", "website"];

const privacyOf = (privacyMap, key, fallback) =>
    privacyMap?.[key] === "public" || privacyMap?.[key] === "private"
        ? privacyMap[key]
        : fallback;

// Only the social links that are BOTH set and marked public (per-platform
// toggle; default public, matching the user schema defaults).
export const publicSocialLinksOf = (user) => {
    const socials = {};
    for (const key of SOCIAL_KEYS) {
        const url = user?.socialLinks?.[key];
        if (url && privacyOf(user?.socialPrivacy, key, "public") === "public") {
            socials[key] = url;
        }
    }
    return socials;
};
