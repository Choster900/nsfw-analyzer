import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// ==================== Types ====================

interface NSFWPrediction {
  className: string;
  probability: number;
}

interface NSFWResultsProps {
  predictions: NSFWPrediction[];
}

// ==================== Component ====================

export const NSFWResults = memo<NSFWResultsProps>(({ predictions }) => {
  const topClassification = useMemo(() => {
    const sorted = [...predictions].sort((a, b) => b.probability - a.probability);
    return sorted[0];
  }, [predictions]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔞 Análisis NSFW</Text>

      {topClassification && (
        <View style={styles.mainResult}>
          <Text style={styles.mainClass}>Clasificación: {topClassification.className}</Text>
          <Text style={styles.mainPercentage}>
            {(topClassification.probability * 100).toFixed(2)}%
          </Text>
        </View>
      )}

      <Text style={styles.detailsTitle}>Detalles:</Text>
      {predictions.map((prediction, index) => (
        <View key={`${prediction.className}-${index}`} style={styles.predictionRow}>
          <Text style={styles.className}>{prediction.className}</Text>
          <View style={styles.barContainer}>
            <View style={[styles.bar, { width: `${prediction.probability * 100}%` }]} />
          </View>
          <Text style={styles.percentage}>{(prediction.probability * 100).toFixed(2)}%</Text>
        </View>
      ))}
    </View>
  );
});

NSFWResults.displayName = 'NSFWResults';

// ==================== Styles ====================

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  mainResult: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  mainClass: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  mainPercentage: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#666',
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  className: {
    width: 100,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 10,
  },
  percentage: {
    width: 60,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});
