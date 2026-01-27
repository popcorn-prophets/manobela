import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';

import { SearchBoxProps, SearchLocation, useNominatimSearch } from 'expo-osm-sdk';
import {
  X,
  Search,
  MapPin,
  Home,
  ShoppingBag,
  Building,
  Trees,
  Mountain,
  Map,
  Flag,
} from 'lucide-react-native';

import { cn } from '@/lib/utils';
import { useTheme } from '@react-navigation/native';

type SearchBoxTheme = {
  containerClass?: string;
  containerStyle?: StyleProp<ViewStyle>;

  inputClass?: string;
  inputStyle?: StyleProp<TextStyle>;

  iconColor?: string;

  resultsClass?: string;
  resultsStyle?: StyleProp<ViewStyle>;

  resultClass?: string;
  resultHoverStyle?: StyleProp<ViewStyle>;
  resultTextClass?: string;
  resultTitleClass?: string;
  resultSubtitleClass?: string;

  errorClass?: string;
  errorStyle?: StyleProp<ViewStyle>;
  errorTextClass?: string;
};

const defaultTheme: SearchBoxTheme = {
  containerClass: 'bg-background flex-row items-center rounded-full px-2 py-1',
  inputClass: 'flex-1 text-foreground placeholder:text-muted-foreground',

  resultsClass: 'mt-2 rounded-md border max-h-72 overflow-hidden bg-popover',
  resultClass: 'flex-row items-center border-b px-3 py-3 last:border-b-0',

  resultTextClass: 'text-primary',
  resultTitleClass: 'text-primary font-medium',
  resultSubtitleClass: 'text-muted-foreground',

  errorClass: 'mt-2 rounded-md p-2 bg-destructive/10',
  errorTextClass: 'text-sm text-destructive',
};

const categoryIcon = (category: string) => {
  const map: Record<string, React.ComponentType<any>> = {
    amenity: Home,
    shop: ShoppingBag,
    tourism: Flag,
    leisure: Map,
    natural: Trees,
    place: MapPin,
    highway: Mountain,
    building: Building,
    landuse: Mountain,
    waterway: MapPin,
  };

  return map[category] || MapPin;
};

export const SearchBox: React.FC<
  SearchBoxProps & {
    theme?: Partial<SearchBoxTheme>;
    className?: string;
    containerStyle?: StyleProp<ViewStyle>;
    style?: StyleProp<TextStyle>;
  }
> = ({
  onLocationSelected,
  onResultsChanged,
  onClear,
  placeholder = 'Search for places...',
  value,
  editable = true,
  style,
  containerStyle,
  maxResults = 5,
  showCurrentLocation = true, // restored from original
  autoComplete = true,
  debounceMs = 300,
  theme,
  className,
}) => {
  const { colors } = useTheme();

  const [query, setQuery] = useState(value ?? '');
  const [showResults, setShowResults] = useState(false);

  const { search, isLoading, error, lastResults, clearResults } = useNominatimSearch();

  const inputRef = useRef<TextInput | null>(null);
  const selectingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable callback ref (restored)
  const onResultsChangedRef = useRef(onResultsChanged);
  useEffect(() => {
    onResultsChangedRef.current = onResultsChanged;
  }, [onResultsChanged]);

  const mergedTheme = useMemo(
    () => ({
      ...defaultTheme,
      ...theme,
      iconColor: theme?.iconColor ?? colors.primary,
    }),
    [theme, colors.primary]
  );

  const currentValue = value ?? query;

  const resetResults = useCallback(() => {
    clearResults();
    setShowResults(false);
    onResultsChangedRef.current?.([]);
  }, [clearResults]);

  const runSearch = useCallback(
    async (q: string) => {
      const results = await search(q, { limit: maxResults });
      setShowResults(results.length > 0);
      onResultsChangedRef.current?.(results);
      return results;
    },
    [search, maxResults]
  );

  useEffect(() => {
    if (value !== undefined) setQuery(value);
  }, [value]);

  useEffect(() => {
    // Prevent duplicate search on selection
    if (selectingRef.current) {
      selectingRef.current = false;
      return;
    }

    if (!autoComplete || !editable || !query.trim()) {
      resetResults();
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        await runSearch(query);
      } catch {
        resetResults();
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, autoComplete, editable, debounceMs, runSearch, resetResults]);

  const handleSelect = (location: SearchLocation) => {
    selectingRef.current = true;

    setQuery(location.displayName);
    resetResults();
    onLocationSelected?.(location);

    setTimeout(() => {
      inputRef.current?.blur();
      setTimeout(() => {
        selectingRef.current = false;
      }, 100);
    }, 100);
  };

  const handleSearchPress = async () => {
    if (!query.trim()) return;
    try {
      await runSearch(query);
    } catch {
      // ignore
    }
  };

  const handleClear = () => {
    setQuery('');
    resetResults();

    // Only clear controlled value if controlled
    if (value !== undefined) {
      onClear?.();
    }

    inputRef.current?.focus();
  };

  return (
    <View className={`relative z-50 ${className ?? ''}`} style={containerStyle}>
      <View className={cn(mergedTheme.containerClass)} style={mergedTheme.containerStyle}>
        <TextInput
          ref={inputRef}
          className={cn(mergedTheme.inputClass)}
          style={style}
          placeholder={placeholder}
          value={currentValue}
          editable={editable}
          onChangeText={editable ? setQuery : undefined}
          returnKeyType="search"
          onSubmitEditing={handleSearchPress}
          onFocus={() => {
            if (lastResults.length && autoComplete) setShowResults(true);
          }}
          onBlur={() => {
            setTimeout(() => {
              if (!selectingRef.current) setShowResults(false);
            }, 200);
          }}
        />

        <View className="ml-2 flex-row items-center">
          {isLoading && (
            <ActivityIndicator size="small" style={{ marginRight: 8 }} color={colors.border} />
          )}

          {!!currentValue.length && !isLoading && (
            <TouchableOpacity onPress={handleClear} className="p-1">
              <X size={18} color={colors.border} />
            </TouchableOpacity>
          )}

          {!autoComplete && (
            <TouchableOpacity onPress={handleSearchPress} className="ml-1 p-1">
              <Search size={18} color={mergedTheme.iconColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {error && (
        <View className={cn(mergedTheme.errorClass)} style={mergedTheme.errorStyle}>
          <Text className={cn(mergedTheme.errorTextClass)}>{error}</Text>
        </View>
      )}

      {showResults && lastResults.length > 0 && (
        <View className={cn(mergedTheme.resultsClass)} style={mergedTheme.resultsStyle}>
          {lastResults.slice(0, maxResults).map((result, index) => {
            const parts = result.displayName.split(',');
            const title = parts[0];
            const subtitle = parts.slice(1).join(',').trim();

            const Icon = categoryIcon(result.category || '');

            return (
              <Pressable
                key={result.placeId ?? index}
                onPress={() => handleSelect(result)}
                onPressIn={() => {
                  selectingRef.current = true;
                }}
                className={cn(mergedTheme.resultClass)}
                style={({ pressed }) => (pressed ? mergedTheme.resultHoverStyle : undefined)}>
                <View className="mr-3">
                  <Icon size={18} color={mergedTheme.iconColor} />
                </View>

                <View className="flex-1">
                  <Text className={cn(mergedTheme.resultTextClass)}>
                    <Text className={cn(mergedTheme.resultTitleClass)}>{title}</Text>
                    {subtitle ? (
                      <Text className={cn(mergedTheme.resultSubtitleClass)}> {subtitle}</Text>
                    ) : null}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
};
