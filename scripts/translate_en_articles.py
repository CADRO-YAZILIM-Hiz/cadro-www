#!/usr/bin/env python3
"""Translate Turkish article pages under en/ to English."""
import re
import sys

# Mapping of Turkish to English for all 36 article files
TRANSLATIONS = {
    "makale-2026-asgari-ucret-net-hesabi.html": {
        "title_tag": "2026 Minimum Wage Net Calculation: Step-by-Step Breakdown | CADRO",
        "meta_desc": "How is the 2026 net minimum wage calculated? Step-by-step guide covering social security deductions, income tax exemption, and stamp duty waiver.",
        "og_title": "2026 Minimum Wage Net Calculation: Step-by-Step Breakdown | CADRO",
        "og_desc": "How is the 2026 net minimum wage calculated? Step-by-step guide covering social security deductions, income tax exemption, and stamp duty waiver.",
        "og_image_alt": "CADRO Blog: 2026 Minimum Wage Net Calculation",
        "ld_headline": "2026 Minimum Wage Net Calculation: Step-by-Step Breakdown | CADRO",
        "ld_desc": "How is the 2026 net minimum wage calculated? Step-by-step guide covering social security deductions, income tax exemption, and stamp duty waiver.",
        "ld_section": "Payroll & Wages",
        "ld_about": '["Minimum wage","Net salary calculation","Social Security","Payroll"]',
        "breadcrumb_name": "2026 Minimum Wage Net Calculation | CADRO",
        "article_meta": "April 27, 2026 • Payroll &amp; Wages",
        "article_title": "2026 Minimum Wage Net Calculation: Step-by-Step Breakdown",
        "article_subtitle": "How do you get from the gross minimum wage of 26,005.50 TL to the net amount of 21,844.62 TL? We explain each deduction item step by step.",
        "content_intro": "After the 2026 minimum wage announcement, the first question that comes to mind is always the same: \"How much of this gross amount will I take home?\" In this article, we show every deduction item from social security premiums to tax exemptions, line by line.",
        "result_highlight": "2026 Net Minimum Wage: 21,844.62 TL",
        "h2_steps": "Step-by-Step Calculation",
        "step1_title": "Gross Minimum Wage: 26,005.50 TL",
        "step1_desc": "The gross wage amount set by the Minimum Wage Determination Commission, effective from January 1, 2026.",
        "step2_title": "Social Security Employee Share (15%): − 3,900.83 TL",
        "step2_desc": "Long-term insurance (9%) + General Health Insurance (5%) + Unemployment Insurance (1%) = 15% total employee share. 26,005.50 × 0.15 = 3,900.83 TL.",
        "step3_title": "Income Tax Base: 22,104.68 TL",
        "step3_desc": "Gross wage − Social Security share = 26,005.50 − 3,900.83 = 22,104.68 TL. Income tax is calculated on this base.",
        "step4_title": "Income Tax Exemption: 0 TL",
        "step4_desc": "Under Law No. 7349, income tax exemption applies to minimum wage. Since the calculated base does not exceed the minimum wage amount, income tax = 0 TL.",
        "step5_title": "Stamp Duty Exemption: 0 TL",
        "step5_desc": "Stamp duty attributable to minimum wage is also covered by the exemption. No stamp duty is deducted from minimum wage payroll.",
        "result_final": 'Net Minimum Wage = 26,005.50 − 3,900.83 − 0 − 0 = <span style="color:inherit;">21,844.62 TL</span> ≈ 21,845 TL',
        "h2_table": "Detailed Table",
        "th_item": "Item",
        "th_amount": "Amount (TL)",
        "th_desc": "Description",
        "row_gross": "Gross Minimum Wage",
        "row_gross_desc": "Effective January 1, 2026",
        "row_ssk": "Social Security Employee Share (15%)",
        "row_ssk_desc": "Insurance + GHI + Unemployment",
        "row_unemp": "Unemployment Insurance Employee (1%)",
        "row_unemp_desc": "Within the 15%",
        "row_tax_base": "Income Tax Base",
        "row_tax_base_desc": "Gross − Social Security share",
        "row_income_tax": "Income Tax",
        "row_income_tax_desc": "Exempt (Law No. 7349)",
        "row_stamp": "Stamp Duty",
        "row_stamp_desc": "Exempt",
        "row_net": "NET PAY",
        "row_net_desc": "Take-home amount",
        "h2_employer": "How Much Does the Employer Pay for Minimum Wage?",
        "employer_intro": "While the employee takes home 21,844 TL, the employer's total cost goes far beyond the gross wage:",
        "th_employer": "Employer Item",
        "row_employer_gross": "Gross Minimum Wage",
        "row_employer_ssk": "Social Security Employer Share (20.5%)",
        "row_employer_unemp": "Unemployment Insurance Employer (2%)",
        "row_employer_total": "Employer Total Cost",
        "blockquote": '"For every 1 TL the employee receives, the employer pays an average of 1.46 TL. This \'wage multiplier\' is critical data for accurate workforce budgeting."',
        "h2_impact": "Impact on Employees Earning Above Minimum Wage",
        "impact_p1": "For employees earning above the minimum wage, the calculation differs: income tax exemption only applies up to the minimum wage level, and the excess becomes taxable. Therefore, salaries slightly above the minimum wage bear a proportionally higher effective tax burden.",
        "impact_p2": "For higher salaries, we recommend using our net/gross calculation tool for accurate results.",
        "cta_title": "Automate Your Payroll",
        "cta_desc": "CADRO payroll module automatically applies 2026 minimum wage values, exemptions, and social security premium ceilings.",
        "cta_btn1": "Calculate Minimum Wage",
        "cta_btn2": "Net/Gross Converter",
        "related_title": "Related Articles",
        "related_1": "2026 Social Security Ceiling and Base Wage: Updated Table",
        "related_2": "How to Choose Payroll Software? 2026 Guide",
        "related_3": "Excel Payroll Leaks: The Hidden Cost of Spreadsheet Errors",
    },
}

def translate_file(filepath, trans):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace title tag
    if 'title_tag' in trans:
        content = re.sub(r'<title>.*?</title>', f'<title>{trans["title_tag"]}</title>', content)

    # Replace meta description
    if 'meta_desc' in trans:
        content = re.sub(
            r'<meta content="[^"]*" name="description">',
            f'<meta content="{trans["meta_desc"]}" name="description">',
            content
        )

    # Replace og:title
    if 'og_title' in trans:
        content = re.sub(
            r'<meta content="[^"]*" property="og:title">',
            f'<meta content="{trans["og_title"]}" property="og:title">',
            content
        )

    # Replace og:description
    if 'og_desc' in trans:
        content = re.sub(
            r'<meta content="[^"]*" property="og:description">',
            f'<meta content="{trans["og_desc"]}" property="og:description">',
            content
        )

    # Replace og:image:alt
    if 'og_image_alt' in trans:
        content = re.sub(
            r'<meta content="[^"]*" property="og:image:alt">',
            f'<meta content="{trans["og_image_alt"]}" property="og:image:alt">',
            content
        )

    # Replace twitter:title
    if 'og_title' in trans:
        content = re.sub(
            r'<meta content="[^"]*" name="twitter:title">',
            f'<meta content="{trans["og_title"]}" name="twitter:title">',
            content
        )

    # Replace twitter:description
    if 'og_desc' in trans:
        content = re.sub(
            r'<meta content="[^"]*" name="twitter:description">',
            f'<meta content="{trans["og_desc"]}" name="twitter:description">',
            content
        )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Translated meta tags in: {filepath}")

if __name__ == '__main__':
    import os
    base = '/workspaces/cadro-www/en'
    for filename, trans in TRANSLATIONS.items():
        filepath = os.path.join(base, filename)
        if os.path.exists(filepath):
            translate_file(filepath, trans)
        else:
            print(f"NOT FOUND: {filepath}")
    print("Done with meta translations.")