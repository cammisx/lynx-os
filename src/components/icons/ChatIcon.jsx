/**
 * Ícone do chat: os dois balões de conversa em vidro, com o gradiente do tema.
 * Desenho original da Chloë (Group122), adaptado para var(--c1) como os outros ícones.
 */
export default function ChatIcon({ size = 48, ...rest }) {
  const largura = Math.round((size * 75) / 82);
  return (
    <svg
      width={largura}
      height={size}
      viewBox="0 0 75 82"
      fill="none"
      aria-hidden="true"
      {...rest}
    >
      <g filter="url(#chat-filter0_f_131_2320)">
      <path d="M33.5607 48C29.6947 48 26.5607 44.866 26.5607 41C26.5607 37.134 29.6947 34 33.5607 34C37.4267 34 40.5607 37.134 40.5607 41C40.5607 42.2925 40.2104 43.5032 39.5995 44.5423C39.5233 44.6719 39.5033 44.8278 39.5508 44.9704L40.2444 47.0513C40.3747 47.4422 40.0029 47.8141 39.612 47.6838L37.5311 46.9901C37.3885 46.9426 37.2326 46.9627 37.103 47.0389C36.0639 47.6497 34.8532 48 33.5607 48Z" fillRule="evenodd" clipRule="evenodd" fill="url(#chat-paint0_linear_131_2320)" />
      </g>
      <path d="M41.5607 51C37.6947 51 34.5607 47.866 34.5607 44C34.5607 40.134 37.6947 37 41.5607 37C45.4267 37 48.5607 40.134 48.5607 44C48.5607 45.2925 48.2104 46.5032 47.5995 47.5423C47.5233 47.6719 47.5033 47.8278 47.5508 47.9704L48.2444 50.0513C48.3747 50.4422 48.0029 50.8141 47.612 50.6838L45.5311 49.9901C45.3885 49.9426 45.2326 49.9627 45.103 50.0389C44.0639 50.6497 42.8532 51 41.5607 51Z" fillRule="evenodd" clipRule="evenodd" fill="url(#chat-paint1_linear_131_2320)" />
      <g filter="url(#chat-filter1_d_131_2320)" data-figma-bg-blur-radius="4">
      <use href="#chat-stroke0_131_2320" fill="url(#chat-paint2_linear_131_2320)" shapeRendering="crispEdges" />
      <mask id="chat-stroke1_131_2320" fill="white">
      <use href="#chat-stroke0_131_2320" />
      </mask>
      <path d="M41.5607 41C41.5607 46.5228 37.0835 51 31.5607 51C29.6778 51 27.9165 50.4796 26.4127 49.5749C26.2839 49.4974 26.1279 49.4776 25.9853 49.5251L22.5094 50.6838C22.1185 50.8141 21.7466 50.4422 21.8769 50.0513L23.0355 46.5754C23.0831 46.4328 23.0633 46.2768 22.9858 46.148C22.081 44.6442 21.5607 42.8828 21.5607 41C21.5607 35.4772 26.0378 31 31.5607 31C37.0835 31 41.5607 35.4772 41.5607 41Z" strokeWidth="2" stroke="url(#chat-paint3_linear_131_2320)" shapeRendering="crispEdges" mask="url(#chat-stroke1_131_2320)" />
      </g>
      <g filter="url(#chat-filter2_di_131_2320)">
      <rect width="2" height="2" rx="1" transform="matrix(1 0 0 -1 26.5607 42)" fill="url(#chat-paint4_linear_131_2320)" shapeRendering="crispEdges" />
      </g>
      <g filter="url(#chat-filter3_di_131_2320)">
      <rect width="2" height="2" rx="1" transform="matrix(1 0 0 -1 30.5607 42)" fill="url(#chat-paint5_linear_131_2320)" shapeRendering="crispEdges" />
      </g>
      <g filter="url(#chat-filter4_di_131_2320)">
      <rect width="2" height="2" rx="1" transform="matrix(1 0 0 -1 34.5607 42)" fill="url(#chat-paint6_linear_131_2320)" shapeRendering="crispEdges" />
      </g>
      <defs>
      <filter id="chat-filter0_f_131_2320" x="-7.43933" y="0" width="82" height="82" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="BackgroundImageFix" />
      <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
      <feGaussianBlur stdDeviation="17" result="effect1_foregroundBlur_131_2320" />
      </filter>
      <filter id="chat-filter1_d_131_2320" x="17.5607" y="27" width="28" height="32" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="BackgroundImageFix" />
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
      <feOffset dy="4" />
      <feGaussianBlur stdDeviation="2" />
      <feComposite in2="hardAlpha" operator="out" />
      <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_131_2320" />
      <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_131_2320" result="shape" />
      </filter>
      <clipPath id="chat-bgblur_0_131_2320_clip_path" transform="translate(-17.5607 -27)"><path fillRule="evenodd" clipRule="evenodd" d="M31.5607 51C37.0835 51 41.5607 46.5228 41.5607 41C41.5607 35.4772 37.0835 31 31.5607 31C26.0378 31 21.5607 35.4772 21.5607 41C21.5607 42.8828 22.081 44.6442 22.9858 46.148C23.0633 46.2768 23.0831 46.4328 23.0355 46.5754L21.8769 50.0513C21.7466 50.4422 22.1185 50.8141 22.5094 50.6838L25.9853 49.5251C26.1279 49.4776 26.2839 49.4974 26.4127 49.5749C27.9165 50.4796 29.6778 51 31.5607 51Z" />
      </clipPath><filter id="chat-filter2_di_131_2320" x="25.0607" y="39.5" width="5" height="5" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="BackgroundImageFix" />
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
      <feOffset dy="1" />
      <feGaussianBlur stdDeviation="0.75" />
      <feComposite in2="hardAlpha" operator="out" />
      <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_131_2320" />
      <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_131_2320" result="shape" />
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
      <feOffset dy="8" />
      <feGaussianBlur stdDeviation="2" />
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
      <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0" />
      <feBlend mode="normal" in2="shape" result="effect2_innerShadow_131_2320" />
      </filter>
      <filter id="chat-filter3_di_131_2320" x="29.0607" y="39.5" width="5" height="5" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="BackgroundImageFix" />
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
      <feOffset dy="1" />
      <feGaussianBlur stdDeviation="0.75" />
      <feComposite in2="hardAlpha" operator="out" />
      <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_131_2320" />
      <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_131_2320" result="shape" />
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
      <feOffset dy="8" />
      <feGaussianBlur stdDeviation="2" />
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
      <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0" />
      <feBlend mode="normal" in2="shape" result="effect2_innerShadow_131_2320" />
      </filter>
      <filter id="chat-filter4_di_131_2320" x="33.0607" y="39.5" width="5" height="5" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="BackgroundImageFix" />
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
      <feOffset dy="1" />
      <feGaussianBlur stdDeviation="0.75" />
      <feComposite in2="hardAlpha" operator="out" />
      <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_131_2320" />
      <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_131_2320" result="shape" />
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
      <feOffset dy="8" />
      <feGaussianBlur stdDeviation="2" />
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
      <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0" />
      <feBlend mode="normal" in2="shape" result="effect2_innerShadow_131_2320" />
      </filter>
      <linearGradient id="chat-paint0_linear_131_2320" x1="40.5607" y1="34" x2="26.5607" y2="48" gradientUnits="userSpaceOnUse">
      <stop stopColor="var(--c1)" />
      <stop offset="1" stopColor="var(--c1-deep)" />
      </linearGradient>
      <linearGradient id="chat-paint1_linear_131_2320" x1="48.5607" y1="37" x2="34.5607" y2="51" gradientUnits="userSpaceOnUse">
      <stop stopColor="var(--c1)" />
      <stop offset="1" stopColor="var(--c1-deep)" />
      </linearGradient>
      <linearGradient id="chat-paint2_linear_131_2320" x1="18.5607" y1="53" x2="41.5607" y2="31" gradientUnits="userSpaceOnUse">
      <stop stopColor="white" stopOpacity="0.2" />
      <stop offset="1" stopColor="white" stopOpacity="0.5" />
      </linearGradient>
      <linearGradient id="chat-paint3_linear_131_2320" x1="39.5607" y1="53" x2="21.5607" y2="31.5" gradientUnits="userSpaceOnUse">
      <stop stopColor="white" stopOpacity="0" />
      <stop offset="1" stopColor="white" />
      </linearGradient>
      <linearGradient id="chat-paint4_linear_131_2320" x1="-0.3" y1="2.2" x2="2" y2="-1.71363e-08" gradientUnits="userSpaceOnUse">
      <stop stopColor="white" stopOpacity="0.2" />
      <stop offset="1" stopColor="white" stopOpacity="0.5" />
      </linearGradient>
      <linearGradient id="chat-paint5_linear_131_2320" x1="-0.3" y1="2.2" x2="2" y2="-1.71363e-08" gradientUnits="userSpaceOnUse">
      <stop stopColor="white" stopOpacity="0.2" />
      <stop offset="1" stopColor="white" stopOpacity="0.5" />
      </linearGradient>
      <linearGradient id="chat-paint6_linear_131_2320" x1="-0.3" y1="2.2" x2="2" y2="-1.71363e-08" gradientUnits="userSpaceOnUse">
      <stop stopColor="white" stopOpacity="0.2" />
      <stop offset="1" stopColor="white" stopOpacity="0.5" />
      </linearGradient>
      <path id="chat-stroke0_131_2320" d="M31.5607 51C37.0835 51 41.5607 46.5228 41.5607 41C41.5607 35.4772 37.0835 31 31.5607 31C26.0378 31 21.5607 35.4772 21.5607 41C21.5607 42.8828 22.081 44.6442 22.9858 46.148C23.0633 46.2768 23.0831 46.4328 23.0355 46.5754L21.8769 50.0513C21.7466 50.4422 22.1185 50.8141 22.5094 50.6838L25.9853 49.5251C26.1279 49.4776 26.2839 49.4974 26.4127 49.5749C27.9165 50.4796 29.6778 51 31.5607 51Z" fillRule="evenodd" clipRule="evenodd" />
      </defs>
    </svg>
  );
}
