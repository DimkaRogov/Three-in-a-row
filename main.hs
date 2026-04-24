import System.Random (randomRIO)

type Board = [[Int]]

-- размер поля, можно поменять
boardSize :: Int
boardSize = 6

-- просто проверяем что три числа одинаковые
allEqual :: Int -> Int -> Int -> Bool
allEqual x y z = x == y && y == z

-- получить элемент с поля
getCell :: Board -> Int -> Int -> Int
getCell board r c = board !! r !! c

-- генерируем случайное число от 1 до 3
generateNewElement :: IO Int
generateNewElement = randomRIO (1, 3)

-- Случайное поле без доработок под «нет троек в начале» (как в веб-версии)
generateBoard :: IO Board
generateBoard =
    mapM (const $ mapM (const generateNewElement) [1..boardSize]) [1..boardSize]

-- вывод поля с номерами строк и столбцов
printBoard :: Board -> IO ()
printBoard board = do
    putStrLn $ "    | " ++ unwords (map show [1..boardSize])
    putStrLn $ "----+" ++ replicate (2 * boardSize) '-'
    mapM_ printRow (zip [1..] board)
    putStrLn ""
  where
    printRow (i, row) = putStrLn $ padRowIndex i ++ " | " ++ unwords (map show row)
    padRowIndex n
        | n < 10 = ' ' : show n
        | otherwise = show n

-- проверяем что два элемента стоят рядом
isAdjacent :: (Int, Int) -> (Int, Int) -> Bool
isAdjacent (r1, c1) (r2, c2) =
    (abs (r1 - r2) == 1 && c1 == c2) ||
    (r1 == r2 && abs (c1 - c2) == 1)

-- меняем два элемента местами
-- возвращаем Nothing если что-то не так
swap :: Board -> (Int, Int) -> (Int, Int) -> Maybe Board
swap board (r1, c1) (r2, c2)
    | r1 < 0 || r1 >= boardSize || c1 < 0 || c1 >= boardSize ||
      r2 < 0 || r2 >= boardSize || c2 < 0 || c2 >= boardSize = Nothing
    | not (isAdjacent (r1, c1) (r2, c2)) = Nothing
    | otherwise = Just $ modifyBoard board r1 c1 r2 c2

modifyBoard :: Board -> Int -> Int -> Int -> Int -> Board
modifyBoard board r1 c1 r2 c2 =
    let newBoard   = modifyCell board r1 c1 (getCell board r2 c2)
        finalBoard = modifyCell newBoard r2 c2 (getCell board r1 c1)
    in finalBoard

-- меняем одну ячейку
modifyCell :: Board -> Int -> Int -> Int -> Board
modifyCell board r c newVal =
    let newRow = take c (board !! r) ++ [newVal] ++ drop (c + 1) (board !! r)
    in take r board ++ [newRow] ++ drop (r + 1) board

-- ищем горизонтальные тройки
findHorizontalTriples :: Board -> [(Int, Int, Int)]
findHorizontalTriples board =
    [ (row, col, col + 2)
    | row <- [0..boardSize-1]
    , col <- [0..boardSize-3]
    , allEqual (getCell board row col)
               (getCell board row (col+1))
               (getCell board row (col+2))
    ]

-- ищем вертикальные тройки
findVerticalTriples :: Board -> [(Int, Int, Int)]
findVerticalTriples board =
    [ (row, col, row + 2)
    | col <- [0..boardSize-1]
    , row <- [0..boardSize-3]
    , allEqual (getCell board row col)
               (getCell board (row+1) col)
               (getCell board (row+2) col)
    ]

-- все тройки вместе
findAllTriples :: Board -> [(Int, Int, Int)]
findAllTriples board = findHorizontalTriples board ++ findVerticalTriples board

-- есть ли вообще тройки на поле
hasAnyTriples :: Board -> Bool
hasAnyTriples board = not $ null $ findAllTriples board

-- собираем все ячейки которые надо удалить
-- nub убирает дубликаты (на случай если тройки пересекаются)
collectCellsToRemove :: Board -> [(Int, Int)]
collectCellsToRemove board =
    let horizontals = findHorizontalTriples board
        verticals   = findVerticalTriples board
        hCells = [(r, c) | (r, cStart, cEnd) <- horizontals, c <- [cStart..cEnd]]
        vCells = [(r, c) | (rStart, c, rEnd) <- verticals,   r <- [rStart..rEnd]]
    in nub (hCells ++ vCells)
  where
    nub [] = []
    nub (x:xs) = x : nub (filter (/= x) xs)

-- считаем очки - каждая удалённая ячейка = 10 очков
calculateScore :: Board -> Int
calculateScore board = length (collectCellsToRemove board) * 10

-- обнуляем все ячейки с тройками
removeAllTriples :: Board -> Board
removeAllTriples board =
    let cells = collectCellsToRemove board
    in foldl (\acc (r, c) -> modifyCell acc r c 0) board cells

-- находим пустые ячейки и заполняем случайными 1..3
addNewElements :: Board -> IO Board
addNewElements board = do
    let emptyCells = [(r, c) | r <- [0..boardSize-1], c <- [0..boardSize-1], getCell board r c == 0]
    if null emptyCells
        then return board
        else do
            newEls <- mapM (const generateNewElement) emptyCells
            return $ foldl (\b ((r, c), e) -> modifyCell b r c e) board (zip emptyCells newEls)

main :: IO ()
main = do
    putStrLn "================================"
    putStrLn "      Игра 'Три в ряд'         "
    putStrLn "================================"
    putStrLn $ "Размер поля: " ++ show boardSize ++ "x" ++ show boardSize
    putStrLn "Генерация поля..."
    board <- generateBoard
    putStrLn "Поле готово!\n"
    gameLoop 0 board

gameLoop :: Int -> Board -> IO ()
gameLoop score board = do
    printBoard board

    if hasAnyTriples board
        then do
            let gained = calculateScore board
            putStrLn $ "Найдены тройки! +" ++ show gained ++ " очков"
            let removedBoard = removeAllTriples board
            updatedBoard <- addNewElements removedBoard
            gameLoop (score + gained) updatedBoard
        else do
            putStrLn $ "Счёт: " ++ show score
            putStrLn "Введите координаты (строка1 столбец1 строка2 столбец2)"
            putStrLn "Например: 1 2 1 3 - или 'q' для выхода"
            input <- getLine
            case input of
                "q" -> do
                    putStrLn "================================"
                    putStrLn $ "Игра окончена! Итог: " ++ show score
                    putStrLn "================================"
                _ -> case words input of
                    [r1, c1, r2, c2] ->
                        handleMove score board (read r1 - 1, read c1 - 1, read r2 - 1, read c2 - 1)
                    _ -> do
                        putStrLn "Неверный формат! Нужно 4 числа через пробел."
                        gameLoop score board

handleMove :: Int -> Board -> (Int, Int, Int, Int) -> IO ()
handleMove score board (r1, c1, r2, c2) =
    case swap board (r1, c1) (r2, c2) of
        Nothing -> do
            putStrLn "Ошибка: элементы должны быть соседними и в пределах поля!"
            gameLoop score board
        Just newBoard -> do
            putStrLn "Обмен выполнен!"
            gameLoop score newBoard