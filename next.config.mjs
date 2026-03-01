/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        domains: ['graph.microsoft.com', 'avatars.githubusercontent.com'],
    },
    experimental: {
        optimizeCss: false,
    },
};

export default nextConfig;
