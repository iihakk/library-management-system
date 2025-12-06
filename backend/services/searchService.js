const pool = require('../config/database');

// calc levenshtein distance - for fuzzy matching stuff
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

// calc how similar two strings are (returns percentage)
function calculateSimilarity(str1, str2) {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return ((maxLen - distance) / maxLen) * 100;
}

// generate patterns for typos - handles stuff like yamsine -> yasmine
function generateFuzzySearchPatterns(searchTerm) {
  const patterns = [];
  const term = searchTerm.toLowerCase();
  
  // keyboard map - letters that are next to each other on keyboard (qwerty layout)
  const keyboardAdjacent = {
    // top row keys
    'q': ['w'], 'w': ['q', 'e'], 'e': ['w', 'r'], 'r': ['e', 't'], 
    't': ['r', 'y'], 'y': ['t', 'u'], 'u': ['y', 'i'], 'i': ['u', 'o'], 
    'o': ['i', 'p'], 'p': ['o'],
    // middle row
    'a': ['s'], 's': ['a', 'd'], 'd': ['s', 'f'], 'f': ['d', 'g'], 
    'g': ['f', 'h'], 'h': ['g', 'j'], 'j': ['h', 'k'], 'k': ['j', 'l'], 
    'l': ['k'],
    // bottom row
    'z': ['x'], 'x': ['z', 'c'], 'c': ['x', 'v'], 'v': ['c', 'b'], 
    'b': ['v', 'n'], 'n': ['b', 'm'], 'm': ['n']
  };
  
  // common char swaps - vowels and consonants that sound similar
  const substitutions = {
    // vowels
    'a': ['e', 'i', 'o'],
    'e': ['a', 'i', 'o'],
    'i': ['a', 'e', 'y'],
    'o': ['a', 'e', 'u'],
    'u': ['o', 'a', 'y'], // y is next to u on keyboard
    'y': ['i', 'e', 'u', 't'], // u and t are nearby
    // consonants that get mixed up alot
    'b': ['d', 'p', 'v', 'n'], // n is close
    'd': ['b', 't', 'p', 's', 'f'], // s and f nearby
    'p': ['b', 'd', 'o'], // o is next to p
    't': ['d', 'r', 'y'], // r and y are close
    'v': ['b', 'f', 'c'], // c is nearby
    'f': ['v', 'ph', 'd', 'g'], // d and g are close
    'ph': ['f'],
    // other common ones
    's': ['z', 'c', 'x', 'a', 'd'], // a and d nearby
    'z': ['s', 'x'], // x is close
    'c': ['s', 'k', 'x', 'v'], // x and v nearby
    'k': ['c', 'j', 'l'], // j and l are close
    'g': ['j', 'f', 'h'], // f and h nearby
    'j': ['g', 'h', 'k'], // h and k close
    'm': ['n'], // n is right next to it
    'n': ['m', 'b'], // b is nearby
    'r': ['l', 'e', 't'], // e and t are close
    'l': ['r', 'k'], // k is nearby
    'w': ['v', 'e', 'q'], // e and q are close
    'x': ['s', 'z', 'c'], // s, z, c nearby
    'h': ['g', 'j'] // g and j are close
  };
  
  // try swapping chars at each position to find typos
  for (let i = 0; i < term.length; i++) {
    const char = term[i];
    
    // check keyboard adjacent keys (people hit wrong key alot)
    if (keyboardAdjacent[char]) {
      keyboardAdjacent[char].forEach(adj => {
        const variant = term.substring(0, i) + adj + term.substring(i + 1);
        if (variant !== term && !patterns.includes(variant)) {
          patterns.push(variant);
        }
      });
    }
    
    // also check similar sounding chars
    if (substitutions[char]) {
      substitutions[char].forEach(sub => {
        const variant = term.substring(0, i) + sub + term.substring(i + 1);
        if (variant !== term && !patterns.includes(variant)) {
          patterns.push(variant);
        }
      });
    }
  }
  
  // also try swapping adjacent chars (like typing "teh" instead of "the")
  for (let i = 0; i < term.length - 1; i++) {
    const swapped = term.substring(0, i) + term[i + 1] + term[i] + term.substring(i + 2);
    if (swapped !== term && !patterns.includes(swapped)) {
      patterns.push(swapped);
    }
  }
  
  // only return first 8 patterns, too many slows things down
  return patterns.slice(0, 8);
}

// advanced search - does fulltext and fuzzy matching stuff
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

    // fulltext search with fuzzy stuff
    if (query && query.trim()) {
      const searchTerm = query.trim();
      const mysql = require('mysql2');
      const escapedTerm = mysql.escape(searchTerm);
      const searchPattern = `%${searchTerm}%`;
      
      // generate fuzzy patterns for typos like yamsine -> yasmine
      const fuzzyPatterns = generateFuzzySearchPatterns(searchTerm);
      
      // build the LIKE conditions for fuzzy matching
      let fuzzyLikeConditions = '';
      if (fuzzyPatterns.length > 0) {
        fuzzyLikeConditions = ' ' + fuzzyPatterns.map(() => 'OR LOWER(title) LIKE ? OR LOWER(author) LIKE ?').join(' ');
      }
      
      // use FULLTEXT search with fuzzy matching
      // SOUNDEX helps with phonetic stuff (catches typos like bracula -> dracula)
      // LOWER() makes it case insensitive
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
      
      // add base search patterns (lowercase)
      const lowerSearchPattern = `%${searchTerm.toLowerCase()}%`;
      params.push(lowerSearchPattern, lowerSearchPattern, searchPattern, searchPattern);
      
      // add the fuzzy patterns (already lowercase)
      fuzzyPatterns.forEach(pattern => {
        params.push(`%${pattern}%`, `%${pattern}%`);
      });
      
      // order by relevance - exact matches first
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

    // ISBN search - remove dashes/spaces and do partial match
    if (isbn) {
      // normalize isbn - strip dashes and spaces, make uppercase
      const normalizedIsbn = isbn.replace(/[-\s]/g, '').toUpperCase();
      // search with normalized isbn (works with partial matches too)
      whereConditions.push('REPLACE(REPLACE(UPPER(isbn), "-", ""), " ", "") LIKE ?');
      params.push(`%${normalizedIsbn}%`);
    }

    // publisher search - case insensitive
    if (publisher) {
      whereConditions.push('LOWER(publisher) LIKE ?');
      params.push(`%${publisher.toLowerCase()}%`);
    }

    // year filtering
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

    // book type filter
    if (bookType && bookType !== 'all') {
      if (bookType === 'both') {
        whereConditions.push("book_type IN ('both', 'physical', 'electronic')");
      } else {
        whereConditions.push('book_type = ? OR book_type = ?');
        params.push(bookType, 'both');
      }
    }

    // only show available books if this is set
    if (availableOnly === 'true' || availableOnly === true) {
      whereConditions.push('available_copies > 0');
    }

    // category filter
    if (category) {
      whereConditions.push('category = ?');
      params.push(category);
    }

    // author filter
    if (author) {
      whereConditions.push('author LIKE ?');
      params.push(`%${author}%`);
    }

    // min rating filter
    if (minRating) {
      whereConditions.push('average_rating >= ?');
      params.push(parseFloat(minRating));
    }

    // Build query
    let queryStr = 'SELECT * FROM books';
    if (whereConditions.length > 0) {
      queryStr += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    // LIMIT and OFFSET cant use ? placeholders in mysql, have to interpolate
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    queryStr += ` ${orderBy} LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [books] = await pool.execute(queryStr, params);

    // get total count - rebuild query but simpler (for pagination)
    let countQuery = 'SELECT COUNT(*) as total FROM books';
    const countParams = [];
    
    if (whereConditions.length > 0) {
      // build count query - replace FULLTEXT/SOUNDEX with simple LIKE
      const countConditions = [];
      let paramIndex = 0;
      
      for (let i = 0; i < whereConditions.length; i++) {
        const cond = whereConditions[i];
        
        if (cond.includes('MATCH') && query && query.trim()) {
          // replace the complex search stuff with simple LIKE
          const searchPattern = `%${query.trim()}%`;
          const fuzzyPatterns = generateFuzzySearchPatterns(query.trim());
          let fuzzyLike = '';
          if (fuzzyPatterns.length > 0) {
            fuzzyLike = ' ' + fuzzyPatterns.map(() => 'OR LOWER(title) LIKE ? OR LOWER(author) LIKE ?').join(' ');
          }
          countConditions.push(`(LOWER(title) LIKE ? OR LOWER(author) LIKE ? OR LOWER(description) LIKE ? OR LOWER(isbn) LIKE ? OR LOWER(publisher) LIKE ?${fuzzyLike})`);
          
          // add search params
          const lowerSearchPattern = `%${query.trim().toLowerCase()}%`;
          countParams.push(lowerSearchPattern, lowerSearchPattern, lowerSearchPattern, lowerSearchPattern, lowerSearchPattern);
          fuzzyPatterns.forEach(pattern => {
            countParams.push(`%${pattern}%`, `%${pattern}%`);
          });
          
          // skip search params in main array (already added above)
          const searchParamCount = 4 + fuzzyPatterns.length * 2;
          paramIndex += searchParamCount;
        } else {
          // keep other conditions as is (isbn, publisher, year etc)
          countConditions.push(cond);
          const paramCount = (cond.match(/\?/g) || []).length;
          if (paramCount > 0) {
            countParams.push(...params.slice(paramIndex, paramIndex + paramCount));
            paramIndex += paramCount;
          }
        }
      }
      
      countQuery += ' WHERE ' + countConditions.join(' AND ');
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

// get search suggestions for autocomplete - uses fuzzy matching
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
    
    // build query with fuzzy matching (case insensitive)
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
    
    // add fuzzy patterns
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

