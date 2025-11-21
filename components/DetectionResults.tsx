import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MultiModalDetectionResult } from '../services/localDetection';

// ==================== Types ====================

interface DetectionResultsProps {
  result: MultiModalDetectionResult;
}

// ==================== Component ====================

export const DetectionResults = memo<DetectionResultsProps>(({ result }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Análisis de Seguridad (100% Local)</Text>

      {/* Status Banner */}
      {!result.overallSafe ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <View style={styles.warningTextContainer}>
            <Text style={styles.warningTitle}>Contenido Bloqueado</Text>
            <Text style={styles.warningText}>{result.warnings.join('\n')}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.safeBanner}>
          <Text style={styles.safeIcon}>✅</Text>
          <Text style={styles.safeText}>Contenido seguro</Text>
        </View>
      )}

      {/* All Categories */}
      {result.categories.length > 0 && (
        <>
          <Text style={styles.detailsTitle}>Categorías Detectadas:</Text>
          {result.categories.map((cat, index) => (
            <CategoryRow
              key={`cat-${index}`}
              category={cat.category}
              confidence={cat.confidence}
              isInappropriate={cat.isInappropriate}
            />
          ))}
        </>
      )}

      {/* Detailed Breakdown */}
      <Text style={styles.sectionTitle}>📊 Análisis por Categoría:</Text>

      {result.details.nsfw.length > 0 && (
        <CategorySection title="🔞 Contenido Sexual" items={result.details.nsfw} />
      )}

      {result.details.violence.length > 0 && (
        <CategorySection title="💥 Violencia" items={result.details.violence} />
      )}

      {result.details.drugs.length > 0 && (
        <CategorySection title="💊 Drogas" items={result.details.drugs} />
      )}

      {result.details.weapons.length > 0 && (
        <CategorySection title="🔫 Armas" items={result.details.weapons} />
      )}
    </View>
  );
});

DetectionResults.displayName = 'DetectionResults';

// ==================== Sub-Components ====================

interface CategoryRowProps {
  category: string;
  confidence: number;
  isInappropriate: boolean;
}

const CategoryRow = memo<CategoryRowProps>(({ category, confidence, isInappropriate }) => (
  <View style={styles.predictionRow}>
    <Text style={[styles.className, isInappropriate && styles.inappropriate]}>{category}</Text>
    <View style={styles.barContainer}>
      <View
        style={[
          styles.bar,
          isInappropriate && styles.dangerBar,
          { width: `${confidence * 100}%` },
        ]}
      />
    </View>
    <Text style={styles.percentage}>{(confidence * 100).toFixed(1)}%</Text>
  </View>
));

CategoryRow.displayName = 'CategoryRow';

interface CategorySectionProps {
  title: string;
  items: Array<{ category: string; confidence: number }>;
}

const CategorySection = memo<CategorySectionProps>(({ title, items }) => (
  <View style={styles.categorySection}>
    <Text style={styles.categoryTitle}>{title}</Text>
    {items.map((item, index) => (
      <View key={`item-${index}`} style={styles.miniRow}>
        <Text style={styles.miniLabel}>{item.category}</Text>
        <Text style={styles.miniValue}>{(item.confidence * 100).toFixed(1)}%</Text>
      </View>
    ))}
  </View>
));

CategorySection.displayName = 'CategorySection';

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
  warningBanner: {
    backgroundColor: '#FEE',
    borderLeftWidth: 4,
    borderLeftColor: '#F44',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C00',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#800',
  },
  safeBanner: {
    backgroundColor: '#EFE',
    borderLeftWidth: 4,
    borderLeftColor: '#4C4',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  safeIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  safeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#080',
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
  inappropriate: {
    color: '#D00',
    fontWeight: 'bold',
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
  dangerBar: {
    backgroundColor: '#F44',
  },
  percentage: {
    width: 60,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  categorySection: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  miniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  miniLabel: {
    fontSize: 13,
    color: '#666',
  },
  miniValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
});
