import pandas as pd

def load_employee_data(filepath):

    df = pd.read_csv(filepath)
    df.drop(['EmployeeID', 'Over18', 'StandardHours'], axis=1, inplace=True, errors='ignore')

    # Convert target variable
    if 'Attrition' in df.columns:
        df['Attrition'] = df['Attrition'].map({'Yes': 1, 'No': 0})

    return df