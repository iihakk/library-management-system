-- Add Sample Books to Library System
USE library_system;

INSERT INTO books (title, author, isbn, publisher, publication_year, category, description, total_copies, available_copies) VALUES
('The Great Gatsby', 'F. Scott Fitzgerald', '978-0-7432-7356-5', 'Scribner', 1925, 'Fiction', 'A classic American novel set in the Jazz Age, following the mysterious millionaire Jay Gatsby and his obsession with Daisy Buchanan.', 5, 5),
('To Kill a Mockingbird', 'Harper Lee', '978-0-06-112008-4', 'J.B. Lippincott & Co.', 1960, 'Fiction', 'A gripping tale of racial injustice and childhood innocence in the American South, told through the eyes of Scout Finch.', 4, 4),
('1984', 'George Orwell', '978-0-452-28423-4', 'Secker & Warburg', 1949, 'Dystopian Fiction', 'A dystopian social science fiction novel about totalitarian surveillance and thought control in a future society.', 6, 6),
('Pride and Prejudice', 'Jane Austen', '978-0-14-143951-8', 'T. Egerton', 1813, 'Romance', 'A romantic novel of manners that follows the character development of Elizabeth Bennet, the dynamic protagonist.', 5, 5),
('The Catcher in the Rye', 'J.D. Salinger', '978-0-316-76948-0', 'Little, Brown and Company', 1951, 'Fiction', 'A controversial novel about teenage rebellion and alienation, told from the perspective of Holden Caulfield.', 3, 3),
('Lord of the Flies', 'William Golding', '978-0-571-05686-9', 'Faber and Faber', 1954, 'Fiction', 'A story about a group of British boys stranded on an uninhabited island and their disastrous attempt to govern themselves.', 4, 4),
('The Hobbit', 'J.R.R. Tolkien', '978-0-547-92823-7', 'George Allen & Unwin', 1937, 'Fantasy', 'A fantasy novel about the adventures of Bilbo Baggins, a hobbit who goes on an unexpected journey.', 6, 6),
('Brave New World', 'Aldous Huxley', '978-0-06-085052-4', 'Chatto & Windus', 1932, 'Dystopian Fiction', 'A dystopian novel set in a futuristic World State where people are genetically engineered and conditioned.', 4, 4),
('The Lord of the Rings', 'J.R.R. Tolkien', '978-0-544-00017-7', 'George Allen & Unwin', 1954, 'Fantasy', 'An epic high fantasy trilogy about the quest to destroy the One Ring and defeat the Dark Lord Sauron.', 5, 5),
('Jane Eyre', 'Charlotte Brontë', '978-0-14-144114-6', 'Smith, Elder & Co.', 1847, 'Romance', 'A gothic romance novel following the experiences of its eponymous heroine, including her growth to adulthood.', 4, 4),
('Animal Farm', 'George Orwell', '978-0-452-28424-1', 'Secker & Warburg', 1945, 'Political Satire', 'An allegorical novella about a group of farm animals who rebel against their human farmer.', 5, 5),
('Wuthering Heights', 'Emily Brontë', '978-0-14-143955-6', 'Thomas Cautley Newby', 1847, 'Romance', 'A tale of passion and revenge set in the Yorkshire moors, following the doomed love between Heathcliff and Catherine.', 3, 3),
('The Chronicles of Narnia', 'C.S. Lewis', '978-0-06-447119-0', 'Geoffrey Bles', 1950, 'Fantasy', 'A series of seven fantasy novels about children who discover the magical land of Narnia.', 7, 7),
('Moby-Dick', 'Herman Melville', '978-0-14-243724-7', 'Harper & Brothers', 1851, 'Adventure', 'An epic tale of Captain Ahab''s obsessive quest for revenge against the white whale Moby Dick.', 4, 4),
('Frankenstein', 'Mary Shelley', '978-0-14-143947-1', 'Lackington, Hughes, Harding, Mavor & Jones', 1818, 'Gothic Fiction', 'A gothic novel about a young scientist who creates a sapient creature in an unorthodox scientific experiment.', 5, 5),
('The Picture of Dorian Gray', 'Oscar Wilde', '978-0-14-144246-4', 'Lippincott''s Monthly Magazine', 1890, 'Gothic Fiction', 'A philosophical novel about a young man who remains young while his portrait ages, reflecting his moral decay.', 4, 4),
('Dracula', 'Bram Stoker', '978-0-14-143984-6', 'Archibald Constable and Company', 1897, 'Gothic Fiction', 'An epistolary novel about Count Dracula''s attempt to move from Transylvania to England.', 5, 5),
('The Adventures of Huckleberry Finn', 'Mark Twain', '978-0-14-243717-9', 'Chatto & Windus', 1884, 'Adventure', 'A novel about a young boy''s journey down the Mississippi River with an escaped slave.', 4, 4),
('One Hundred Years of Solitude', 'Gabriel García Márquez', '978-0-06-088328-7', 'Harper & Row', 1967, 'Magical Realism', 'A multi-generational saga about the Buendía family in the fictional town of Macondo.', 5, 5),
('The Kite Runner', 'Khaled Hosseini', '978-1-59448-000-3', 'Riverhead Books', 2003, 'Fiction', 'A story about the unlikely friendship between a wealthy boy and the son of his father''s servant in Afghanistan.', 6, 6);

