import json
from pathlib import Path
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
ARTIFACTS_DIR = REPO_ROOT / "artifacts" / "ui-review"
BRAIN_DIR = Path("C:/Users/meets/.gemini/antigravity/brain/627ee552-4723-454f-ab48-47108b40d973/ui_review")


def srgb_to_lin(c: int) -> float:
    v = c / 255.0
    return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4


def luminance(hex_code: str) -> float:
    h = hex_code.lstrip("#")
    r, g, b = [int(h[i : i + 2], 16) for i in (0, 2, 4)]
    return 0.2126 * srgb_to_lin(r) + 0.7152 * srgb_to_lin(g) + 0.0722 * srgb_to_lin(b)


def contrast_ratio(c1: str, c2: str) -> float:
    l1, l2 = luminance(c1), luminance(c2)
    if l1 < l2:
        l1, l2 = l2, l1
    return (l1 + 0.05) / (l2 + 0.05)


def analyze_cut_pixels(img_path: Path) -> dict[str, float | int]:
    img = Image.open(img_path).convert("RGB")
    width, height = img.size
    total_pixels = width * height

    # Count pixels closely matching signature cut (#FF4A2B = rgb 255, 74, 43)
    # Range: r in [220, 255], g in [40, 100], b in [20, 70]
    cut_pixels = 0
    for pixel in img.getdata():
        r, g, b = pixel
        if r >= 220 and 40 <= g <= 100 and 20 <= b <= 70:
            cut_pixels += 1

    percentage = (cut_pixels / total_pixels) * 100.0
    return {
        "width": width,
        "height": height,
        "total_pixels": total_pixels,
        "cut_pixels": cut_pixels,
        "cut_percentage": round(percentage, 4),
        "pass_budget": percentage < 3.0,
    }


def main() -> None:
    manifest_path = ARTIFACTS_DIR / "review-manifest.json"
    if not manifest_path.exists():
        print(f"Error: manifest not found at {manifest_path}")
        return

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    print("==================================================")
    print("KERF UI REVIEW: FONT AUDIT & VIEWPORT PIXEL ANALYSIS")
    print("==================================================")

    font_audit = manifest.get("fontAudit", {})
    print(f"Instrument Sans bundled & loaded: {font_audit.get('instrumentSans')}")
    print(f"JetBrains Mono bundled & loaded:  {font_audit.get('jetbrainsMono')}")
    print(f"Fraunces bundled & loaded:        {font_audit.get('fraunces')}")

    results_table = []
    for entry in manifest.get("results", []):
        vp_label = entry["viewport"]["label"]
        for mode in ["default", "collapsed", "focus"]:
            filename = entry[mode]
            filepath = ARTIFACTS_DIR / filename
            stats = analyze_cut_pixels(filepath)
            status = "PASS" if stats["pass_budget"] else "FAIL"
            print(
                f"[{status}] {vp_label} | {mode:9s} | cut: {stats['cut_pixels']:>5} px ({stats['cut_percentage']:.3f}%) / budget <3.0%"
            )
            results_table.append(
                {
                    "viewport": vp_label,
                    "mode": mode,
                    "filename": filename,
                    **stats,
                }
            )

    # Contrast Matrix
    print("\n==================================================")
    print("WCAG 2.1 AA CONTRAST RATIO AUDIT")
    print("==================================================")
    bg_tokens = {"--bg-0": "#0E0E0C", "--bg-1": "#151512", "--bg-2": "#1C1C18"}
    text_tokens = {
        "--text-0": "#ECE9DF",
        "--text-1": "#B9B5A6",
        "--text-2": "#7E7B6E",
        "--cut": "#FF4A2B",
        "--agent": "#D8C46A",
    }

    contrast_report = {}
    for bg_name, bg_val in bg_tokens.items():
        print(f"\nBackground: {bg_name} ({bg_val})")
        contrast_report[bg_name] = {}
        for txt_name, txt_val in text_tokens.items():
            ratio = contrast_ratio(bg_val, txt_val)
            passes_normal = ratio >= 4.5
            passes_large = ratio >= 3.0
            print(
                f"  {txt_name:10s} ({txt_val}): {ratio:>5.2f}:1  [Normal AA: {'PASS' if passes_normal else 'EXEMPT/FAIL'}, UI/Large AA: {'PASS' if passes_large else 'FAIL'}]"
            )
            contrast_report[bg_name][txt_name] = {
                "hex": txt_val,
                "ratio": round(ratio, 2),
                "passes_normal_aa": passes_normal,
                "passes_large_ui_aa": passes_large,
            }

    analysis_summary = {
        "font_audit": font_audit,
        "pixel_coverage": results_table,
        "contrast_matrix": contrast_report,
    }

    with open(ARTIFACTS_DIR / "analysis-summary.json", "w", encoding="utf-8") as f:
        json.dump(analysis_summary, f, indent=2)
    with open(BRAIN_DIR / "analysis-summary.json", "w", encoding="utf-8") as f:
        json.dump(analysis_summary, f, indent=2)

    print("\nSaved full audit to artifacts/ui-review/analysis-summary.json")


if __name__ == "__main__":
    main()
