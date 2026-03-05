import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.callbacks import EarlyStopping
import joblib
import Load_Data as LD



print("\nDataset Shape:", LD.df.shape)
print("\nMissing Values:\n", LD.df.isnull().sum())
print("\nData Types:\n", LD.df.dtypes)
print("\nFirst 5 Rows:\n", LD.df.head())

# target column
target = "FeedBack"
if target not in LD.df.columns:
    raise ValueError(f"Target column '{target}' not found in dataset!")

# feature type detection
cat_features = LD.df.select_dtypes(include=['object', 'category']).columns.tolist()
if target in cat_features:
    cat_features.remove(target)
num_features = [col for col in LD.df.columns if col not in cat_features + [target]]

print(f"\nCategorical features: {cat_features}")
print(f"Numerical features: {num_features}")




# Check target distribution
print("\nTarget Distribution:\n", LD.df[target].value_counts())
sns.countplot(x=target, data=LD.df)
plt.title("Target Class Distribution")
plt.show()

# Warn if classes are highly imbalanced
class_counts = LD.df[target].value_counts(normalize=True)
if class_counts.max() > 0.7:
    print("Warning: Target classes are highly imbalanced!")


# Preprocessing

X = LD.df.drop(target, axis=1)
y = LD.df[target]

preprocessor = ColumnTransformer([
    ("num", StandardScaler(), num_features),
    ("cat", OneHotEncoder(drop='first', handle_unknown='ignore'), cat_features)
])

X_processed = preprocessor.fit_transform(X)
num_classes = len(y.unique())
y_categorical = to_categorical(y - 1, num_classes=num_classes)

# Train-test split with stratification
X_train, X_test, y_train, y_test = train_test_split(
    X_processed, y_categorical, test_size=0.2, random_state=42, stratify=y
)

print(f"Processed feature shape: {X_processed.shape}")
print(f"Number of classes: {num_classes}")


# Build Advanced Neural Network (deep learning)

model = Sequential([
    Dense(256, activation="relu", input_shape=(X_train.shape[1],)),
    BatchNormalization(),
    Dropout(0.4),
    Dense(128, activation="relu"),
    BatchNormalization(),
    Dropout(0.3),
    Dense(64, activation="relu"),
    BatchNormalization(),
    Dropout(0.2),
    Dense(num_classes, activation="softmax")
])

model.compile(
    optimizer="adam",
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

print(model.summary())


# Train Model with Early Stopping

early_stopping = EarlyStopping(
    monitor='val_loss',
    patience=15,
    restore_best_weights=True,
    verbose=1
)

try:
    history = model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=200,
        batch_size=16,
        verbose=1,
        callbacks=[early_stopping]
    )
except Exception as e:
    raise RuntimeError(f"Training failed. Error: {e}")


# Training Visualization

plt.figure(figsize=(12,5))
plt.subplot(1,2,1)
plt.plot(history.history['accuracy'], label='Train Acc')
plt.plot(history.history['val_accuracy'], label='Val Acc')
plt.title("Accuracy Over Epochs")
plt.xlabel("Epoch")
plt.ylabel("Accuracy")
plt.legend()

plt.subplot(1,2,2)
plt.plot(history.history['loss'], label='Train Loss')
plt.plot(history.history['val_loss'], label='Val Loss')
plt.title("Loss Over Epochs")
plt.xlabel("Epoch")
plt.ylabel("Loss")
plt.legend()
plt.show()

# Evaluate Model

loss, acc = model.evaluate(X_test, y_test, verbose=0)
print(f"\nTest Accuracy: {acc:.4f}")
print(f"Test Loss: {loss:.4f}")

predictions = model.predict(X_test)
predicted_classes = np.argmax(predictions, axis=1) + 1
actual_classes = np.argmax(y_test, axis=1) + 1

print("\nClassification Report:")
print(classification_report(actual_classes, predicted_classes))

plt.figure(figsize=(8,6))
sns.heatmap(confusion_matrix(actual_classes, predicted_classes), annot=True, fmt='d', cmap='Blues')
plt.title("Confusion Matrix")
plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.show()

# Optional: Multi-class ROC-AUC
try:
    roc_auc = roc_auc_score(y_test, predictions, multi_class='ovr')
    print(f"Multi-class ROC-AUC Score: {roc_auc:.4f}")
except Exception as e:
    print(f"ROC-AUC not calculated. Error: {e}")


#Save Model

model.save("Performance Productivity Model/advanced_feedback_model.h5")
joblib.dump(preprocessor, "preprocessor.pkl")
print("\nModel and preprocessor saved for deployment.")
