const pool = require('../config/database');

// Calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        );
      }
    }
  }

  return matrix[len1][len2];
}

// Calculate similarity percentage
function calculateSimilarity(str1, str2) {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return ((maxLen - distance) / maxLen) * 100;
}

// Generate fuzzy search patterns for common typos
function generateFuzzySearchPatterns(searchTerm) {
  const patterns = [];
  const term = searchTerm.toLowerCase();
  
  // Keyboard adjacency map (QWERTY layout - letters physically next to each other)
  const keyboardAdjacent = {
    // Top row: q-w-e-r-t-y-u-i-o-p
    'q': ['w'], 'w': ['q', 'e'], 'e': ['w', 'r'], 'r': ['e', 't'], 
    't': ['r', 'y'], 'y': ['t', 'u'], 'u': ['y', 'i'], 'i': ['u', 'o'], 
    'o': ['i', 'p'], 'p': ['o'],
    // Middle row: a-s-d-f-g-h-j-k-l
    'a': ['s'], 's': ['a', 'd'], 'd': ['s', 'f'], 'f': ['d', 'g'], 
    'g': ['f', 'h'], 'h': ['g', 'j'], 'j': ['h', 'k'], 'k': ['j', 'l'], 
    'l': ['k'],
    // Bottom row: z-x-c-v-b-n-m
    'z': ['x'], 'x': ['z', 'c'], 'c': ['x', 'v'], 'v': ['c', 'b'], 
    'b': ['v', 'n'], 'n': ['b', 'm'], 'm': ['n']
  };
  
  // Common character substitutions (vowels and similar-sounding consonants)
  const substitutions = {
    // Vowels
    'a': ['e', 'i', 'o'],
    'e': ['a', 'i', 'o'],
    'i': ['a', 'e', 'y'],
    'o': ['a', 'e', 'u'],
    'u': ['o', 'a', 'y'], // Added y (keyboard adjacent)
    'y': ['i', 'e', 'u', 't'], // Added u and t (keyboard adjacent)
    // Similar-sounding consonants (common keyboard typos)
    'b': ['d', 'p', 'v', 'n'], // Added n (keyboard adjacent)
    'd': ['b', 't', 'p', 's', 'f'], // Added s, f (keyboard adjacent)
    'p': ['b', 'd', 'o'], // Added o (keyboard adjacent)
    't': ['d', 'r', 'y'], // Added r, y (keyboard adjacent)
    'v': ['b', 'f', 'c'], // Added c (keyboard adjacent)
    'f': ['v', 'ph', 'd', 'g'], // Added d, g (keyboard adjacent)
    'ph': ['f'],
    // Other common substitutions
    's': ['z', 'c', 'x', 'a', 'd'], // Added a, d (keyboard adjacent)
    'z': ['s', 'x'], // Added x (keyboard adjacent)
    'c': ['s', 'k', 'x', 'v'], // Added x, v (keyboard adjacent)
    'k': ['c', 'j', 'l'], // Added j, l (keyboard adjacent)
    'g': ['j', 'f', 'h'], // Added f, h (keyboard adjacent)
    'j': ['g', 'h', 'k'], // Added h, k (keyboard adjacent)
    'm': ['n'], // n is already keyboard adjacent
    'n': ['m', 'b'], // Added b (keyboard adjacent)
    'r': ['l', 'e', 't'], // Added e, t (keyboard adjacent)
    'l': ['r', 'k'], // Added k (keyboard adjacent)
    'w': ['v', 'e', 'q'], // Added e, q (keyboard adjacent)
    'x': ['s', 'z', 'c'], // Added s, z, c (keyboard adjacent)
    'h': ['g', 'j'] // Added g, j (keyboard adjacent)
  };
  
  // Generate variations by substituting similar characters at each position
  for (let i = 0; i < term.length; i++) {
    const char = term[i];
    
    // Add keyboard-adjacent substitutions (very common typos)
    if (keyboardAdjacent[char]) {
      keyboardAdjacent[char].forEach(adj => {
        const variant = term.substring(0, i) + adj + term.substring(i + 1);
        if (variant !== term && !patterns.includes(variant)) {
          patterns.push(variant);
        }
      });
    }
    
    // Add phonetic/similar-sounding substitutions
    if (substitutions[char]) {
      substitutions[char].forEach(sub => {
        const variant = term.substring(0, i) + sub + term.substring(i + 1);
        if (variant !== term && !patterns.includes(variant)) {
          patterns.push(variant);
        }
      });
    }
  }
  
  // Also try adjacent character swaps (common typing errors)
  for (let i = 0; i < term.length - 1; i++) {
    const swapped = term.substring(0, i) + term[i + 1] + term[i] + term.substring(i + 2);
    if (swapped !== term && !patterns.includes(swapped)) {
      patterns.push(swapped);
    }
  }
  
  // Limit to most relevant patterns (avoid too many)
  return patterns.slice(0, 8);
}

// Advanced search with full-text and fuzzy matching
exports.advancedSearch = async (searchParams) => {
  try {
    const {
      query,
      isbn,
      publisher,
      year,
      yearFrom,
      yearTo,
      bookType,
      availableOnly,
      minRating,
      category,
      author,
      page = 1,
      limit = 20
    } = searchParams;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    const params = [];
    let orderBy = '';

    // Full-text search on query with fuzzy matching
    if (query && query.trim()) {
      const searchTerm = query.trim();
      const mysql = require('mysql2');
      const escapedTerm = mysql.escape(searchTerm);
      const searchPattern = `%${searchTerm}%`;
      
      // Generate fuzzy variations for common typos (e.g., yamsine -> yasmine)
      const fuzzyPatterns = generateFuzzySearchPatterns(searchTerm);
      
      // Build fuzzy LIKE conditions
      let fuzzyLikeConditions = '';
      if (fuzzyPatterns.length > 0) {
        fuzzyLikeConditions = ' ' + fuzzyPatterns.map(() => 'OR LOWER(title) LIKE ? OR LOWER(author) LIKE ?').join(' ');
      }
      
      // Use FULLTEXT search with fuzzy matching
      // Include SOUNDEX for phonetic matching (handles typos like yamsine -> yasmine, bracula -> dracula)
      // Use LOWER() for case-insensitive matching
      whereConditions.push(`(
        MATCH(title, author) AGAINST(${escapedTerm} IN NATURAL LANGUAGE MODE)
        OR MATCH(description) AGAINST(${escapedTerm} IN NATURAL LANGUAGE MODE)
        OR LOWER(title) LIKE ?
        OR LOWER(author) LIKE ?
        OR isbn LIKE ?
        OR publisher LIKE ?
        OR SOUNDEX(title) = SOUNDEX(${escapedTerm})
        OR SOUNDEX(author) = SOUNDEX(${escapedTerm})
        OR SOUNDEX(SUBSTRING(title, 1, LENGTH(${escapedTerm}))) = SOUNDEX(${escapedTerm})
        OR SOUNDEX(SUBSTRING(author, 1, LENGTH(${escapedTerm}))) = SOUNDEX(${escapedTerm})
        ${fuzzyLikeConditions}
      )`);
      
      // Add base patterns (lowercase for case-insensitive matching)
      const lowerSearchPattern = `%${searchTerm.toLowerCase()}%`;
      params.push(lowerSearchPattern, lowerSearchPattern, searchPattern, searchPattern);
      
      // Add fuzzy patterns (already lowercase from generateFuzzySearchPatterns)
      fuzzyPatterns.forEach(pattern => {
        params.push(`%${pattern}%`, `%${pattern}%`);
      });
      
      // Add relevance score for ordering (prioritize exact matches)
      orderBy = `ORDER BY 
        (CASE 
          WHEN LOWER(title) LIKE ${mysql.escape(`%${searchTerm.toLowerCase()}%`)} OR LOWER(author) LIKE ${mysql.escape(`%${searchTerm.toLowerCase()}%`)} THEN 10
          WHEN MATCH(title, author) AGAINST(${escapedTerm} IN NATURAL LANGUAGE MODE) THEN 5
          WHEN SOUNDEX(title) = SOUNDEX(${escapedTerm}) OR SOUNDEX(author) = SOUNDEX(${escapedTerm}) THEN 3
          ELSE 1
        END) DESC,
        title ASC`;
    } else {
      orderBy = 'ORDER BY title ASC';
    }

    // Exact ISBN search
    if (isbn) {
      whereConditions.push('isbn = ?');
      params.push(isbn);
    }

    // Publisher search
    if (publisher) {
      whereConditions.push('publisher LIKE ?');
      params.push(`%${publisher}%`);
    }

    // Year filters
    if (year) {
      whereConditions.push('publication_year = ?');
      params.push(year);
    } else {
      if (yearFrom) {
        whereConditions.push('publication_year >= ?');
        params.push(yearFrom);
      }
      if (yearTo) {
        whereConditions.push('publication_year <= ?');
        params.push(yearTo);
      }
    }

    // Book type filter
    if (bookType && bookType !== 'all') {
      if (bookType === 'both') {
        whereConditions.push("book_type IN ('both', 'physical', 'electronic')");
      } else {
        whereConditions.push('book_type = ? OR book_type = ?');
        params.push(bookType, 'both');
      }
    }

    // Availability filter
    if (availableOnly === 'true' || availableOnly === true) {
      whereConditions.push('available_copies > 0');
    }

    // Category filter
    if (category) {
      whereConditions.push('category = ?');
      params.push(category);
    }

    // Author filter
    if (author) {
      whereConditions.push('author LIKE ?');
      params.push(`%${author}%`);
    }

    // Minimum rating filter
    if (minRating) {
      whereConditions.push('average_rating >= ?');
      params.push(parseFloat(minRating));
    }

    // Build query
    let queryStr = 'SELECT * FROM books';
    if (whereConditions.length > 0) {
      queryStr += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    // LIMIT and OFFSET cannot use placeholders in MySQL prepared statements
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    queryStr += ` ${orderBy} LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [books] = await pool.execute(queryStr, params);

    // Get total count - rebuild query with same conditions but simpler for counting
    let countQuery = 'SELECT COUNT(*) as total FROM books';
    const countParams = [];
    
    if (whereConditions.length > 0) {
      // Build count conditions - replace FULLTEXT and SOUNDEX with LIKE for simpler counting
      const countConditions = whereConditions.map(cond => {
        if (cond.includes('MATCH') && query && query.trim()) {
          const searchPattern = `%${query.trim()}%`;
          const fuzzyPatterns = generateFuzzySearchPatterns(query.trim());
          let fuzzyLike = '';
          if (fuzzyPatterns.length > 0) {
            fuzzyLike = ' ' + fuzzyPatterns.map(() => 'OR title LIKE ? OR author LIKE ?').join(' ');
          }
          return `(title LIKE ? OR author LIKE ? OR description LIKE ? OR isbn LIKE ? OR publisher LIKE ?${fuzzyLike})`;
        }
        return cond;
      });
      
      countQuery += ' WHERE ' + countConditions.join(' AND ');
      
      // Add params for count query
      if (query && query.trim()) {
        const searchPattern = `%${query.trim()}%`;
        const fuzzyPatterns = generateFuzzySearchPatterns(query.trim());
        countParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        fuzzyPatterns.forEach(pattern => {
          countParams.push(`%${pattern}%`, `%${pattern}%`);
        });
      }
      
      // Add other filter params (skip the search params we already added)
      let paramIndex = query ? (4 + generateFuzzySearchPatterns(query.trim()).length * 2) : 0;
      for (let i = 0; i < whereConditions.length; i++) {
        if (!whereConditions[i].includes('MATCH') && !whereConditions[i].includes('SOUNDEX')) {
          const paramCount = (whereConditions[i].match(/\?/g) || []).length;
          if (paramCount > 0) {
            countParams.push(...params.slice(paramIndex, paramIndex + paramCount));
            paramIndex += paramCount;
          }
        }
      }
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    return {
      books,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Advanced search error:', error);
    throw error;
  }
};

// Get search suggestions (for autocomplete) with fuzzy matching
exports.getSearchSuggestions = async (query, limit = 10) => {
  try {
    if (!query || query.length < 2) {
      return [];
    }

    const searchTerm = query.trim();
    const searchPattern = `%${searchTerm}%`;
    const mysql = require('mysql2');
    const escapedTerm = mysql.escape(searchTerm);
    const fuzzyPatterns = generateFuzzySearchPatterns(searchTerm);
    
    const limitNum = parseInt(limit);
    
    // Build query with fuzzy matching (case-insensitive)
    let suggestionQuery = `SELECT DISTINCT title, author, isbn, publisher
       FROM books
       WHERE LOWER(title) LIKE ? 
       OR LOWER(author) LIKE ? 
       OR isbn LIKE ? 
       OR publisher LIKE ?
       OR SOUNDEX(title) = SOUNDEX(${escapedTerm})
       OR SOUNDEX(author) = SOUNDEX(${escapedTerm})
       OR SOUNDEX(SUBSTRING(title, 1, LENGTH(${escapedTerm}))) = SOUNDEX(${escapedTerm})
       OR SOUNDEX(SUBSTRING(author, 1, LENGTH(${escapedTerm}))) = SOUNDEX(${escapedTerm})`;
    
    const lowerSearchPattern = `%${searchTerm.toLowerCase()}%`;
    const suggestionParams = [lowerSearchPattern, lowerSearchPattern, searchPattern, searchPattern];
    
    // Add fuzzy patterns
    if (fuzzyPatterns.length > 0) {
      suggestionQuery += ' ' + fuzzyPatterns.map(() => 'OR LOWER(title) LIKE ? OR LOWER(author) LIKE ?').join(' ');
      fuzzyPatterns.forEach(pattern => {
        suggestionParams.push(`%${pattern}%`, `%${pattern}%`);
      });
    }
    
    suggestionQuery += ` LIMIT ${limitNum}`;
    
    const [results] = await pool.execute(suggestionQuery, suggestionParams);

    return results;
  } catch (error) {
    console.error('Get suggestions error:', error);
    return [];
  }
};

module.exports = {
  advancedSearch: exports.advancedSearch,
  getSearchSuggestions: exports.getSearchSuggestions,
  calculateSimilarity,
  levenshteinDistance
};

