/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // SMB/네트워크 드라이브(NAS)에서 readlink가 EISDIR로 잘못 답하는 이슈 회피.
  // 로컬 빌드에서도 모듈 심볼릭링크 추적 불필요.
  webpack: (config) => {
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
