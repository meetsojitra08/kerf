import json
import shutil
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DOCS_REVIEW_DIR = REPO_ROOT / "docs" / "ui-review"
ARTIFACTS_DIR = REPO_ROOT / "artifacts" / "ui-review"


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


def analyze_cut_pixels(img_path: Path) -> dict[str, float | int | bool]:
    img = Image.open(img_path).convert("RGB")
    width, height = img.size
    total_pixels = width * height

    # Count pixels matching signature cut (#FF4A2B = rgb 255, 74, 43)
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
    DOCS_REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    manifest_source = (
        DOCS_REVIEW_DIR / "review-manifest.json"
        if (DOCS_REVIEW_DIR / "review-manifest.json").exists()
        else ARTIFACTS_DIR / "review-manifest.json"
    )

    if not manifest_source.exists():
        print(f"Error: manifest not found at {manifest_source}")
        return

    with open(manifest_source, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    # Copy screenshots & manifest to docs/ui-review
    shutil.copy2(manifest_source, DOCS_REVIEW_DIR / "review-manifest.json")
    for entry in manifest.get("results", []):
        for mode in ["default", "collapsed", "focus"]:
            fname = entry[mode]
            src_file = ARTIFACTS_DIR / fname
            if src_file.exists():
                shutil.copy2(src_file, DOCS_REVIEW_DIR / fname)

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
            filepath = DOCS_REVIEW_DIR / filename
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
    print("WCAG 2.1 AA CONTRAST RATIO AUDIT (INCLUDING TRACK HUES)")
    print("==================================================")
    bg_tokens = {"--bg-0": "#0E0E0C", "--bg-1": "#151512", "--bg-2": "#1C1C18"}
    text_tokens = {
        "--text-0": "#ECE9DF",
        "--text-1": "#B9B5A6",
        "--text-2": "#8D8A7D",
        "--cut": "#FF4A2B",
        "--agent": "#D8C46A",
        "--track-video": "#6E8FA6",
        "--track-audio": "#7FA37B",
        "--track-music": "#A98BB5",
        "--track-caption": "#C9A36A",
        "--track-overlay": "#B87C6B",
    }

    contrast_report: dict[str, dict[str, dict[str, float | str | bool]]] = {}
    for bg_name, bg_val in bg_tokens.items():
        print(f"\nBackground: {bg_name} ({bg_val})")
        contrast_report[bg_name] = {}
        for txt_name, txt_val in text_tokens.items():
            ratio = contrast_ratio(bg_val, txt_val)
            passes_normal = ratio >= 4.5
            passes_large = ratio >= 3.0
            print(
                f"  {txt_name:16s} ({txt_val}): {ratio:>5.2f}:1  [Normal AA: {'PASS' if passes_normal else 'FAIL'}, UI/Large AA: {'PASS' if passes_large else 'FAIL'}]"
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

    with open(DOCS_REVIEW_DIR / "analysis-summary.json", "w", encoding="utf-8") as f:
        json.dump(analysis_summary, f, indent=2)

    # Generate Markdown Report
    report_md = f"""# UI Review & Contrast Audit Report

Generated automatically during Task 0.4 / Step 0d verification.

## 1. Font Audit
- **Instrument Sans**: {"Loaded" if font_audit.get('instrumentSans') else "Failed"}
- **JetBrains Mono**: {"Loaded" if font_audit.get('jetbrainsMono') else "Failed"}
- **Fraunces**: {"Loaded" if font_audit.get('fraunces') else "Failed"}

## 2. Signature `--cut` Pixel Coverage Budget (< 3.0%)
| Viewport | Mode | File | Cut Pixels | Coverage (%) | Status |
|---|---|---|---|---|---|
"""
    for row in results_table:
        report_md += f"| {row['viewport']} | {row['mode']} | `{row['filename']}` | {row['cut_pixels']} | {row['cut_percentage']}% | {'PASS' if row['pass_budget'] else 'FAIL'} |\n"

    report_md += "\n## 3. WCAG 2.1 AA Contrast Ratios (Normal Text ≥ 4.5:1, UI/Large ≥ 3.0:1)\n\n"
    report_md += "| Background | Token | Hex | Ratio | Normal Text AA | UI / Large AA |\n"
    report_md += "|---|---|---|---|---|---|\n"
    for bg_k, bg_data in contrast_report.items():
        for token_k, token_data in bg_data.items():
            report_md += f"| `{bg_k}` | `{token_k}` | `{token_data['hex']}` | **{token_data['ratio']}:1** | {'PASS' if token_data['passes_normal_aa'] else 'EXEMPT/FAIL'} | {'PASS' if token_data['passes_large_ui_aa'] else 'FAIL'} |\n"

    report_md += "\n## 4. Screenshots\n\n"
    for row in results_table:
        report_md += f"### {row['viewport']} - {row['mode']}\n![{row['mode']} screenshot]({row['filename']})\n\n"

    with open(DOCS_REVIEW_DIR / "REPORT.md", "w", encoding="utf-8") as f:
        f.write(report_md)

    print(f"\nSaved report to {DOCS_REVIEW_DIR / 'REPORT.md'}")


if __name__ == "__main__":
    main()
