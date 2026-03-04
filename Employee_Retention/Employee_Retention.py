import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
import DataLoad as Data
import feature_engineering as FE


# check which exist in dataframe
def get_features(df):
    potential_numeric = ['Age', 'DailyRate', 'DistanceFromHome', 'Education',
                         'EnvironmentSatisfaction', 'HourlyRate', 'JobInvolvement',
                         'JobLevel', 'JobSatisfaction', 'MonthlyIncome',
                         'MonthlyRate', 'NumCompaniesWorked', 'PercentSalaryHike',
                         'PerformanceRating', 'RelationshipSatisfaction',
                         'StockOptionLevel', 'TotalWorkingYears',
                         'TrainingTimesLastYear', 'WorkLifeBalance', 'YearsAtCompany',
                         'YearsInCurrentRole', 'YearsSinceLastPromotion',
                         'YearsWithCurrManager']


    potential_categorical = ['BusinessTravel', 'Department', 'EducationField',
                             'Gender', 'JobRole', 'MaritalStatus', 'OverTime']


    numeric_features = [col for col in potential_numeric if col in df.columns]
    categorical_features = [col for col in potential_categorical if col in df.columns]

    return numeric_features, categorical_features


def build_pipeline(numeric_features, categorical_features):
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())])
    
    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
        ('onehot', OneHotEncoder(handle_unknown='ignore'))])
    
    # Combine preprocessing steps
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('cat', categorical_transformer, categorical_features)])
    
    # Create pipeline with model
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', GradientBoostingClassifier(
            n_estimators=100, learning_rate=0.1, max_depth=3, random_state=42))])
    
    return pipeline

def train_evaluate_model(df):

    numeric_features, categorical_features = get_features(df)
    

    X = df.drop('Attrition', axis=1)
    y = df['Attrition']
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y)
    

    pipeline = build_pipeline(numeric_features, categorical_features)
    pipeline.fit(X_train, y_train)
    

    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]
    
    print("Classification Report:")
    print(classification_report(y_test, y_pred))
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    if hasattr(pipeline.named_steps['classifier'], 'feature_importances_'):
        try:
            ohe = (pipeline.named_steps['preprocessor']
                   .named_transformers_['cat']
                   .named_steps['onehot'])
            cat_feature_names = ohe.get_feature_names_out(categorical_features)
            feature_names = numeric_features + list(cat_feature_names)
            
            # Plot feature importance
            importances = pipeline.named_steps['classifier'].feature_importances_
            indices = np.argsort(importances)[-20:]  # top 20 features
            plt.figure(figsize=(10, 6))
            plt.title('Top 20 Important Features')
            plt.barh(range(len(indices)), importances[indices], color='b', align='center')
            plt.yticks(range(len(indices)), [feature_names[i] for i in indices])
            plt.xlabel('Relative Importance')
            plt.show()
        except Exception as e:
            print(f"Could not plot feature importance: {e}")
    
    return pipeline, y_proba

if __name__ == "__main__":

    try:
        df = Data.load_employee_data("employee_attrition_data.csv")
        df = FE.feature_engineering(df)

        if 'Attrition' not in df.columns:
            raise ValueError("Target column 'Attrition' not found in dataset")

        model, y_proba = train_evaluate_model(df)

        joblib.dump(model, 'employee_attrition_model.pkl')

        test_data = df.drop('Attrition', axis=1).iloc[:5]
        if not test_data.empty:
            predictions = model.predict_proba(test_data)[:, 1]
            print("\nSample Predictions:")
            for i, prob in enumerate(predictions):
                print(f"Employee {i+1}: {'High Risk' if prob > 0.5 else 'Low Risk'} (Probability: {prob:.2f})")
    except Exception as e:
        print(f"Error: {e}")
        print("\nPlease check:")
        print("1. The data file exists and is named 'employee_attrition_data.csv'")
        print("2. The file contains the required columns")
        print("3. You have all the required packages installed")