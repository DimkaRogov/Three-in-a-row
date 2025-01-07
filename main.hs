import System.Random (randomRIO)

-- | Определение типа игрового поля
type Board = [[Int]]

-- | Проверка равенства трех элементов
allEqual :: Int -> Int -> Int -> Bool
allEqual x y z = x == y && y == z

-- | Инициализация игрового поля
initialBoard :: Board
initialBoard = [[1, 2, 3], [1, 2, 3], [1, 2, 3]]

-- | Вывод игрового поля на экран
printBoard :: Board -> IO ()
printBoard board = do
    mapM_ (putStrLn . unwords . map show) board
    putStrLn ""

-- | Проверка соседства элементов
isAdjacent :: (Int, Int) -> (Int, Int) -> Bool
isAdjacent (r1, c1) (r2, c2) = 
    (abs (r1 - r2) == 1 && c1 == c2) ||    -- соседние по вертикали
    (r1 == r2 && abs (c1 - c2) == 1)       -- соседние по горизонтали

-- | Обмен элементов с проверками
swap :: Board -> (Int, Int) -> (Int, Int) -> Maybe Board
swap board (r1, c1) (r2, c2)
    | r1 < 0 || r1 >= 3 || c1 < 0 || c1 >= 3 || 
      r2 < 0 || r2 >= 3 || c2 < 0 || c2 >= 3 = Nothing
    | not (isAdjacent (r1, c1) (r2, c2)) = Nothing
    | otherwise = Just $ modifyBoard board r1 c1 r2 c2

-- | Модификация игрового поля при обмене
modifyBoard :: Board -> Int -> Int -> Int -> Int -> Board
modifyBoard board r1 c1 r2 c2 =
    let newBoard = modifyCell board r1 c1 (board !! r2 !! c2)
        finalBoard = modifyCell newBoard r2 c2 (board !! r1 !! c1)
    in finalBoard

-- | Изменение одной ячейки поля
modifyCell :: Board -> Int -> Int -> Int -> Board
modifyCell board r c newval =
    let newRow = take c (board !! r) ++ [newval] ++ 
                 drop (c + 1) (board !! r)
    in take r board ++ [newRow] ++ drop (r + 1) board

-- | Поиск горизонтальных троек
findTriples :: Board -> [(Int, Int, Int)]
findTriples board = concatMap findRowTriples (zip [0..] board)
    where
        findRowTriples (rowIndex, row) =
            [ (rowIndex, i, i + 2)
            | i <- [0 .. length row - 3]
            , allEqual (row !! i) (row !! (i + 1)) (row !! (i + 2))
            ]

-- | Удаление найденных троек
removeTriples :: Board -> IO Board
removeTriples board = do
    let triples = findTriples board
    if null triples
        then return board
        else do
            let updatedBoard = removeTriplesHelper board triples
            return updatedBoard

-- | Вспомогательная функция для удаления троек
removeTriplesHelper :: Board -> [(Int, Int, Int)] -> Board
removeTriplesHelper board triples =
    foldl (\acc (row, start, end) ->
        take row acc ++
        [take start (acc !! row) ++ replicate 3 0 ++ 
         drop (end + 1) (acc !! row)] ++
        drop (row + 1) acc
    ) board triples

-- | Генерация случайного элемента
generateNewElement :: IO Int
generateNewElement = randomRIO (1, 3)

-- | Безопасное добавление элементов
addElementsSafely :: Board -> [Int] -> [(Int, Int)] -> IO Board
addElementsSafely board elements positions = do
    let updatedBoard = foldl (\acc (pos, el) -> 
            addElementSafely acc (pos, el)) board (zip positions elements)
    if hasTriples updatedBoard
        then do
            newElements <- mapM (const generateNewElement) elements
            addElementsSafely board newElements positions
        else return updatedBoard

-- | Добавление одного элемента
addElementSafely :: Board -> ((Int, Int), Int) -> Board
addElementSafely board ((row, col), element) =
    let newRow = take col (board !! row) ++ [element] ++ 
                 drop (col + 1) (board !! row)
    in take row board ++ [newRow] ++ drop (row + 1) board

-- | Проверка наличия троек
hasTriples :: Board -> Bool
hasTriples board = not $ null $ findTriples board

-- | Добавление новых элементов на пустые места
addNewElements :: Board -> IO Board
addNewElements board = do
    let emptyCells = [(r,c) | r <- [0..2], c <- [0..2], 
                     board !! r !! c == 0]
    if null emptyCells
        then return board
        else do
            newElements <- mapM (const generateNewElement) emptyCells
            addElementsSafely board newElements emptyCells

-- | Основная функция игры
main :: IO ()
main = do
    putStrLn "Игра 'Три в ряд'"
    gameLoop 0 initialBoard

-- | Игровой цикл
gameLoop :: Int -> Board -> IO ()
gameLoop score board = do
    printBoard board
    let triples = findTriples board
    if null triples
        then do
            putStrLn $ "Счёт: " ++ show score
            putStrLn $ "Введите координаты двух соседних элементов для обмена" ++
                      " (строка1, столбец1, строка2, столбец2), или 'q' для выхода:"
            input <- getLine
            case input of
                "q" -> return ()
                _ -> case words input of
                    [r1, c1, r2, c2] -> do
                        let (r1', c1', r2', c2') = 
                                (read r1 :: Int, read c1 :: Int,
                                 read r2 :: Int, read c2 :: Int)
                        case swap board (r1'-1, c1'-1) (r2'-1, c2'-1) of
                            Just newBoard -> do
                                putStrLn "Обмен элементов..."
                                gameLoop score newBoard
                            Nothing -> do
                                putStrLn $ "Ошибка: элементы должны быть" ++
                                          " соседними и в пределах поля!"
                                gameLoop score board
                    _ -> do
                        putStrLn "Неверный формат ввода!"
                        gameLoop score board
        else do
            putStrLn $ "Найдено " ++ show (length triples) ++ 
                      " троек! Обновление игрового поля..."
            removedBoard <- removeTriples board
            updatedBoard <- addNewElements removedBoard
            gameLoop (score + length triples) updatedBoard