// Tailwind CDN theme configuration (must load right after the Tailwind CDN script, before body content)
tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "on-tertiary-fixed": "#001e2c",
                "tertiary": "#000000",
                "tertiary-fixed": "#c4e7ff",
                "on-secondary-container": "#006f66",
                "error-container": "#ffdad6",
                "secondary-fixed": "#89f5e7",
                "surface-container-high": "#e6e8ea",
                "inverse-surface": "#2d3133",
                "on-primary-fixed-variant": "#3f465c",
                "surface-container-highest": "#e0e3e5",
                "primary": "#000000",
                "on-secondary-fixed-variant": "#005049",
                "outline-variant": "#c6c6cd",
                "on-background": "#191c1e",
                "on-error": "#ffffff",
                "background": "#f7f9fb",
                "surface-container-lowest": "#ffffff",
                "on-tertiary-container": "#008ebf",
                "on-surface-variant": "#45464d",
                "surface-container-low": "#f2f4f6",
                "on-primary-fixed": "#131b2e",
                "tertiary-fixed-dim": "#7bd0ff",
                "inverse-primary": "#bec6e0",
                "surface-bright": "#f7f9fb",
                "primary-fixed-dim": "#bec6e0",
                "secondary": "#006a61",
                "surface-dim": "#d8dadc",
                "secondary-fixed-dim": "#6bd8cb",
                "primary-container": "#131b2e",
                "surface": "#f7f9fb",
                "on-tertiary": "#ffffff",
                "surface-container": "#eceef0",
                "on-surface": "#191c1e",
                "on-tertiary-fixed-variant": "#004c69",
                "inverse-on-surface": "#eff1f3",
                "on-error-container": "#93000a",
                "surface-tint": "#565e74",
                "surface-variant": "#e0e3e5",
                "on-primary": "#ffffff",
                "primary-fixed": "#dae2fd",
                "on-secondary-fixed": "#00201d",
                "secondary-container": "#86f2e4",
                "on-secondary": "#ffffff",
                "tertiary-container": "#001e2c",
                "on-primary-container": "#7c839b",
                "outline": "#76777d",
                "error": "#ba1a1a"
            },
            borderRadius: {
                DEFAULT: "0.125rem",
                lg: "0.25rem",
                xl: "0.5rem",
                full: "9999px"
            },
            spacing: {
                gutter: "24px",
                "margin-mobile": "20px",
                "container-max": "1280px",
                unit: "8px",
                "margin-desktop": "64px"
            },
            fontFamily: {
                "headline-lg": ["Inter"],
                "label-caps": ["JetBrains Mono"],
                "display-lg": ["Inter"],
                "headline-lg-mobile": ["Inter"],
                "body-lg": ["Hanken Grotesk"],
                "headline-md": ["Inter"],
                "body-md": ["Hanken Grotesk"],
                "label-sm": ["Hanken Grotesk"]
            },
            fontSize: {
                "headline-lg": ["40px", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
                "label-caps": ["12px", { lineHeight: "1.0", letterSpacing: "0.1em", fontWeight: "500" }],
                "display-lg": ["64px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "600" }],
                "headline-lg-mobile": ["32px", { lineHeight: "1.2", fontWeight: "600" }],
                "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
                "headline-md": ["24px", { lineHeight: "1.4", fontWeight: "500" }],
                "body-md": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
                "label-sm": ["13px", { lineHeight: "1.2", fontWeight: "500" }]
            }
        }
    }
};
