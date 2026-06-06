/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // SMB/네트워크 드라이브(NAS)에서 readlink가 EISDIR로 잘못 답하는 이슈 회피.
  // 로컬 빌드에서도 모듈 심볼릭링크 추적 불필요.
  webpack: (config) => {
    config.resolve.symlinks = false;
    // transformers.js(브라우저 임베딩)의 Node 전용 의존성은 클라이언트 번들에서 제외.
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
};

export default nextConfig;
