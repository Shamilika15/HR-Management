
# Create additional relevant features

def feature_engineering(df):
    df = df.copy()

    if 'YearsAtCompany' in df.columns and 'YearsSinceLastPromotion' in df.columns:
        df['PromotionSpeed'] = df['YearsSinceLastPromotion'] / (df['YearsAtCompany'] + 1)

    if 'MonthlyIncome' in df.columns and 'JobLevel' in df.columns:
        median_income_by_level = df.groupby('JobLevel')['MonthlyIncome'].transform('median')
        df['IncomeRelativeToLevel'] = df['MonthlyIncome'] / median_income_by_level

    return df
