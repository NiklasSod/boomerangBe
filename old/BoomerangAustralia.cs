using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Threading.Tasks;

public class BoomerangAustralia
{
    public TcpListener? AListener;
    public List<Player> Players = new();
    public Card[] ArrayDeck = Array.Empty<Card>();
    public List<Card> Deck = new();

    public class Card
    {
        public string Name;
        public string Letter;
        public string Region;
        public string Collections;
        public string Animals;
        public string Activities;

        public int Number;
        public string? SortMode;

        public Card(
            string name,
            string letter,
            string region,
            int number,
            string collections,
            string animals,
            string activities)
        {
            Name = name;
            Letter = letter;
            Number = number;
            Region = region;
            Collections = collections;
            Animals = animals;
            Activities = activities;
        }

        public override bool Equals(object? obj)
        {
            return obj is Card card &&
                   card.Letter == Letter;
        }

        public override int GetHashCode()
        {
            return Letter.GetHashCode();
        }
    }

    public class Player
    {
        public int PlayerID;
        public bool Online;
        public bool IsBot;

        public TcpClient? Connection;
        public BinaryReader? InFromClient;
        public BinaryWriter? OutToClient;

        public List<string> Region = new();

        public List<Card> NextHand = new();
        public List<Card> Hand = new();
        public List<Card> Draft = new();

        public Dictionary<string, string> Sites = new();
        public List<Dictionary<string, int>> RScore = new();

        public Dictionary<string, int> ActivitiesScore = new();

        public int RegionRoundScore = 0;
        public int FinalScore = 0;

        public Player(
            int playerID,
            bool isBot,
            TcpClient? connection,
            BinaryReader? inFromClient,
            BinaryWriter? outToClient)
        {
            PlayerID = playerID;
            Connection = connection;
            InFromClient = inFromClient;
            OutToClient = outToClient;
            IsBot = isBot;

            Online = connection != null;
        }

        public void SendMessage(object message)
        {
            if (Online)
            {
                try
                {
                    OutToClient!.Write(message.ToString() ?? "");
                    OutToClient.Flush();
                }
                catch
                {
                    // Behåller Java-versionens beteende:
                    // nätverksfel ignoreras.
                }
            }
            else if (!IsBot)
            {
                Console.WriteLine(message);
            }
        }

        public string ReadMessage()
        {
            string word = "";

            if (Online)
            {
                try
                {
                    word = InFromClient!.ReadString();
                }
                catch
                {
                }
            }
            else
            {
                try
                {
                    word = Console.ReadLine() ?? "";
                }
                catch
                {
                }
            }

            return word;
        }

        public void AddCardToDraft(Player sendToPlayer)
        {
            if (Draft.Count == 0)
            {
                SendMessage("You haven't drafted any cards yet");
            }
            else
            {
                SendMessage(
                    "\n*****************************\n" +
                    "Your current draft: \n" +
                    PrintCards(Draft));
            }

            if (Sites.Count > 0)
            {
                var sortedSites = new SortedDictionary<string, string>(Sites);

                string sitesString = string.Join(
                    ", ",
                    sortedSites.Select(x => $"{x.Key}={x.Value}")
                );

                SendMessage(
                    "Sites from previous rounds:\n" +
                    sitesString +
                    "\n");
            }

            SendMessage(
                "\nYour current hand: \n" +
                PrintCards(Hand));

            SendMessage("Type the letter of the card to draft");

            string response;

            if (!IsBot)
            {
                response = ReadMessage();
            }
            else
            {
                response = Hand[Random.Shared.Next(Hand.Count - 1)].Letter;
            }

            Card? chosenCard = null;

            foreach (Card card in Hand)
            {
                if (card.Letter.Equals(
                        response,
                        StringComparison.OrdinalIgnoreCase))
                {
                    chosenCard = card;
                    break;
                }
            }

            if (chosenCard != null)
            {
                Draft.Add(chosenCard);
                Hand.Remove(chosenCard);
            }

            sendToPlayer.NextHand.Clear();

            foreach (Card card in Hand)
            {
                sendToPlayer.NextHand.Add(card);
            }
        }

        public bool CheckRegionComplete(string theRegion)
        {
            List<string> temp = new();

            foreach (KeyValuePair<string, string> site in Sites)
            {
                if (site.Value == theRegion)
                {
                    temp.Add(site.Key);
                }
            }

            foreach (Card card in Draft)
            {
                if (card.Region == theRegion &&
                    !temp.Contains(card.Letter))
                {
                    temp.Add(card.Letter);
                }
            }

            return temp.Count == 4;
        }

        public string PrintCards(IEnumerable<Card> cards)
        {
            List<Card> cardList = cards.ToList();

            string printString =
                string.Format("{0,27}", "Site [letter] (nr):  ");

            foreach (Card card in cardList)
            {
                printString +=
                    string.Format(
                        "{0,-35}",
                        $"{card.Name} [{card.Letter}] ({card.Number})");
            }

            printString +=
                "\n" +
                string.Format("{0,27}", "Region:  ");

            foreach (Card card in cardList)
            {
                printString +=
                    string.Format("{0,-35}", card.Region);
            }

            printString +=
                "\n" +
                string.Format("{0,27}", "Collections:  ");

            foreach (Card card in cardList)
            {
                printString +=
                    string.Format("{0,-35}", card.Collections);
            }

            printString +=
                "\n" +
                string.Format("{0,27}", "Animals:  ");

            foreach (Card card in cardList)
            {
                printString +=
                    string.Format("{0,-35}", card.Animals);
            }

            printString +=
                "\n" +
                string.Format("{0,27}", "Activities:  ");

            foreach (Card card in cardList)
            {
                printString +=
                    string.Format("{0,-35}", card.Activities);
            }

            return printString;
        }

        public int NumberThings(string aThing, string category)
        {
            int nrThings = 0;

            foreach (Card card in Draft)
            {
                if (category == "Collections")
                {
                    if (card.Collections == aThing)
                    {
                        nrThings++;
                    }
                }
                else if (category == "Animals")
                {
                    if (card.Animals == aThing)
                    {
                        nrThings++;
                    }
                }
                else if (category == "Activities")
                {
                    if (card.Activities == aThing)
                    {
                        nrThings++;
                    }
                }
            }

            return nrThings;
        }

        public int RoundScore(int roundNr)
        {
            Dictionary<string, int> score = new();

            // Requirement 10a
            int throwCatchScore =
                Math.Abs(Draft[0].Number - Draft[6].Number);

            SendMessage(
                "This round you scored " +
                throwCatchScore +
                " as your Throw and catch score");

            score["Throw and Catch score"] = throwCatchScore;

            // Requirement 10b
            int thisRoundSites = 0;

            foreach (Card draftCard in Draft)
            {
                if (!Sites.ContainsKey(draftCard.Letter))
                {
                    thisRoundSites++;

                    Sites[draftCard.Letter] =
                        draftCard.Region;
                }
            }

            SendMessage(
                "This round you scored " +
                thisRoundSites +
                " new sites points and " +
                RegionRoundScore +
                " points for completing regions");

            score["Tourist sites score"] = thisRoundSites;

            // Requirement 10c
            string thisRoundCollections = "";
            int countRoundCollections = 0;

            string[] collectionArray =
            {
                "Leaves",
                "Wildflowers",
                "Shells",
                "Souvenirs"
            };

            foreach (string thisColl in collectionArray)
            {
                int nr = NumberThings(
                    thisColl,
                    "Collections");

                int sumColl =
                    nr < 8
                        ? nr * 2
                        : nr;

                thisRoundCollections +=
                    $"{thisColl} [{sumColl} points]\t";

                countRoundCollections += sumColl;
            }

            SendMessage(
                "This round you scored these collections: " +
                thisRoundCollections);

            score["Collections score"] =
                countRoundCollections;

            // Requirement 10d
            string thisRoundAnimals = "";
            int countRoundAnimals = 0;

            string[] animalArray =
            {
                "Kangaroos",
                "Emus",
                "Wombats",
                "Koalas",
                "Platypuses"
            };

            foreach (string thisAnimal in animalArray)
            {
                int frequency =
                    NumberThings(
                        thisAnimal,
                        "Animals");

                if (frequency == 2 &&
                    thisAnimal == "Kangaroos")
                {
                    thisRoundAnimals +=
                        "Kangaroos [3 points]\t";

                    countRoundAnimals += 3;
                }
                else if (
                    frequency == 2 &&
                    thisAnimal == "Emus")
                {
                    thisRoundAnimals +=
                        "Emus [4 points]\t";

                    countRoundAnimals += 4;
                }
                else if (
                    frequency == 2 &&
                    thisAnimal == "Wombats")
                {
                    thisRoundAnimals +=
                        "Wombats [5 points]\t";

                    countRoundAnimals += 5;
                }
                else if (
                    frequency == 2 &&
                    thisAnimal == "Koalas")
                {
                    thisRoundAnimals +=
                        "Koalas [7 points]\t";

                    countRoundAnimals += 7;
                }
                else if (
                    frequency == 2 &&
                    thisAnimal == "Platypuses")
                {
                    thisRoundAnimals +=
                        "Platypuses [9 points]";

                    countRoundAnimals += 9;
                }
            }

            SendMessage(
                "This round you scored these Animals: " +
                thisRoundAnimals);

            score["Animals score"] =
                countRoundAnimals;

            // Requirement 10e
            string[] activities =
            {
                "Indigenous Culture",
                "Bushwalking",
                "Swimming",
                "Sightseeing"
            };

            SendMessage(
                "This round you have gathered " +
                "the following new activities:");

            Dictionary<string, int> newActivitiesMap =
                new();

            string newActivities = "";

            foreach (string activity in activities)
            {
                if (!ActivitiesScore.ContainsKey(activity))
                {
                    int frequency =
                        NumberThings(
                            activity,
                            "Activities");

                    newActivities +=
                        $"{activity}(# {frequency})\t";

                    newActivitiesMap[activity] =
                        frequency;
                }
            }

            SendMessage(
                newActivities +
                "\nSelect if you wish to score one of them");

            int countRoundActivities = 0;

            int[] scoreTable =
            {
                0,
                2,
                4,
                7,
                10,
                15
            };

            foreach (
                KeyValuePair<string, int> entry
                in newActivitiesMap)
            {
                int frequency =
                    NumberThings(
                        entry.Key,
                        "Activities");

                int scoreValue =
                    frequency > 0
                        ? scoreTable[frequency - 1]
                        : 0;

                SendMessage(
                    "Want to keep " +
                    entry.Key +
                    "(" +
                    entry.Value +
                    ") [" +
                    scoreValue +
                    " points]? (Y/N)");

                string response;

                if (!IsBot)
                {
                    response = ReadMessage();
                }
                else
                {
                    response = "Y";
                }

                if (response.Equals(
                        "Y",
                        StringComparison.OrdinalIgnoreCase))
                {
                    ActivitiesScore[entry.Key] =
                        scoreValue;

                    SendMessage(
                        "This round you scored this activity: " +
                        entry.Key +
                        "[" +
                        scoreValue +
                        " points]");

                    countRoundActivities =
                        scoreValue;

                    // Bara en aktivitet får poängsättas
                    // varje runda.
                    break;
                }
            }

            RScore.Add(score);

            // roundNr går från 0 till 3.
            if (roundNr == 3)
            {
                string t =
                    "Throw and Catch score";

                string to =
                    "Tourist sites score";

                string c =
                    "Collections score";

                string a =
                    "Animals score";

                int totalAct = 0;

                foreach (string activity in activities)
                {
                    if (!ActivitiesScore.ContainsKey(activity))
                    {
                        ActivitiesScore[activity] = 0;
                    }

                    totalAct +=
                        ActivitiesScore[activity];
                }

                int totalT =
                    RScore[0][t] +
                    RScore[1][t] +
                    RScore[2][t] +
                    RScore[3][t];

                int totalTo =
                    RScore[0][to] +
                    RScore[1][to] +
                    RScore[2][to] +
                    RScore[3][to];

                int totalC =
                    RScore[0][c] +
                    RScore[1][c] +
                    RScore[2][c] +
                    RScore[3][c];

                int totalA =
                    RScore[0][a] +
                    RScore[1][a] +
                    RScore[2][a] +
                    RScore[3][a];

                string finalScore =
                    "                       Round 1\tRound 2\tRound 3\tRound 4\tTotal\n";

                finalScore +=
                    "Throw and Catch score:   " +
                    $"{RScore[0][t]}\t  " +
                    $"{RScore[1][t]}\t  " +
                    $"{RScore[2][t]}\t  " +
                    $"{RScore[3][t]}\t  " +
                    $"{totalT}\n";

                finalScore +=
                    "  Tourist sites score:   " +
                    $"{RScore[0][to]}\t  " +
                    $"{RScore[1][to]}\t  " +
                    $"{RScore[2][to]}\t  " +
                    $"{RScore[3][to]}\t  " +
                    $"{totalTo}\n";

                finalScore +=
                    "    Collections score:   " +
                    $"{RScore[0][c]}\t  " +
                    $"{RScore[1][c]}\t  " +
                    $"{RScore[2][c]}\t  " +
                    $"{RScore[3][c]}\t  " +
                    $"{totalC}\n";

                finalScore +=
                    "        Animals score:   " +
                    $"{RScore[0][a]}\t  " +
                    $"{RScore[1][a]}\t  " +
                    $"{RScore[2][a]}\t  " +
                    $"{RScore[3][a]}\t  " +
                    $"{totalA}\n";

                finalScore +=
                    "                        " +
                    "IndC\tBushw\tSwim\tSights\n";

                finalScore +=
                    "     Activities score:   " +
                    $"{ActivitiesScore[activities[0]]}\t  " +
                    $"{ActivitiesScore[activities[1]]}\t  " +
                    $"{ActivitiesScore[activities[2]]}\t  " +
                    $"{ActivitiesScore[activities[3]]}\t  " +
                    $"{totalAct}\n";

                finalScore +=
                    "       Region bonuses:   " +
                    $"{Region.Count * 3}\n";

                // Behåller originalkodens poängberäkning.
                // Notera att totalTo inte ingick i Java-kodens
                // slutliga totalpoäng.
                int totalScore =
                    totalT +
                    totalC +
                    totalA +
                    totalAct +
                    Region.Count * 3;

                finalScore +=
                    "          Total score:   " +
                    $"{totalScore} points\n";

                SendMessage(
                    "\n*********************************************\n" +
                    finalScore);

                return totalScore;
            }

            int totalRoundScore =
                RegionRoundScore +
                throwCatchScore +
                thisRoundSites +
                countRoundCollections +
                countRoundAnimals +
                countRoundActivities;

            RegionRoundScore = 0;

            return totalRoundScore;
        }
    }

    public BoomerangAustralia(string[] args)
    {
        if (args.Length == 2 &&
            int.TryParse(args[0], out int numPlayers) &&
            int.TryParse(args[1], out int numBots) &&
            numPlayers + numBots >= 2 &&
            numPlayers + numBots <= 4)
        {
            InitGame(
                numPlayers,
                numBots);
        }
        else if (args.Length == 1)
        {
            Client(args[0]);
        }
        else
        {
            Console.WriteLine(
                "This game is for a total of 2-4 players/bots");

            Console.WriteLine(
                "Server syntax: dotnet run numPlayers numBots");

            Console.WriteLine(
                "Client syntax: dotnet run IP");
        }
    }

    public void InitGame(
        int numPlayers,
        int numBots)
    {
        ArrayDeck = new Card[28];

        ArrayDeck[0] =
            new Card(
                "The Bungle Bungles",
                "A",
                "Western Australia",
                1,
                "Leaves",
                "",
                "Indigenous Culture");

        ArrayDeck[1] =
            new Card(
                "The Pinnacles",
                "B",
                "Western Australia",
                1,
                "",
                "Kangaroos",
                "Sightseeing");

        ArrayDeck[2] =
            new Card(
                "Margaret River",
                "C",
                "Western Australia",
                1,
                "Shells",
                "Kangaroos",
                "");

        ArrayDeck[3] =
            new Card(
                "Kalbarri National Park",
                "D",
                "Western Australia",
                1,
                "Wildflowers",
                "",
                "Bushwalking");

        ArrayDeck[4] =
            new Card(
                "Uluru",
                "E",
                "Northern Territory",
                4,
                "",
                "Emus",
                "Indigenous Culture");

        ArrayDeck[5] =
            new Card(
                "Kakadu National Park",
                "F",
                "Northern Territory",
                4,
                "",
                "Wombats",
                "Sightseeing");

        ArrayDeck[6] =
            new Card(
                "Nitmiluk National Park",
                "G",
                "Northern Territory",
                4,
                "Shells",
                "Platypuses",
                "");

        ArrayDeck[7] =
            new Card(
                "King's Canyon",
                "H",
                "Northern Territory",
                4,
                "",
                "Koalas",
                "Swimming");

        ArrayDeck[8] =
            new Card(
                "The Great Barrier Reef",
                "I",
                "Queensland",
                6,
                "Wildflowers",
                "",
                "Sightseeing");

        ArrayDeck[9] =
            new Card(
                "The Whitsundays",
                "J",
                "Queensland",
                6,
                "",
                "Kangaroos",
                "Indigenous Culture");

        ArrayDeck[10] =
            new Card(
                "Daintree Rainforest",
                "K",
                "Queensland",
                6,
                "Souvenirs",
                "",
                "Bushwalking");

        ArrayDeck[11] =
            new Card(
                "Surfers Paradise",
                "L",
                "Queensland",
                6,
                "Wildflowers",
                "",
                "Swimming");

        ArrayDeck[12] =
            new Card(
                "Barossa Valley",
                "M",
                "South Australia",
                3,
                "",
                "Koalas",
                "Bushwalking");

        ArrayDeck[13] =
            new Card(
                "Lake Eyre",
                "N",
                "South Australia",
                3,
                "",
                "Emus",
                "Swimming");

        ArrayDeck[14] =
            new Card(
                "Kangaroo Island",
                "O",
                "South Australia",
                3,
                "",
                "Kangaroos",
                "Bushwalking");

        ArrayDeck[15] =
            new Card(
                "Mount Gambier",
                "P",
                "South Australia",
                3,
                "Wildflowers",
                "",
                "Sightseeing");

        ArrayDeck[16] =
            new Card(
                "Blue Mountains",
                "Q",
                "New South Whales",
                5,
                "",
                "Wombats",
                "Indigenous Culture");

        ArrayDeck[17] =
            new Card(
                "Sydney Harbour",
                "R",
                "New South Whales",
                5,
                "",
                "Emus",
                "Sightseeing");

        ArrayDeck[18] =
            new Card(
                "Bondi Beach",
                "S",
                "New South Whales",
                5,
                "",
                "Wombats",
                "Swimming");

        ArrayDeck[19] =
            new Card(
                "Hunter Valley",
                "T",
                "New South Whales",
                5,
                "",
                "Emus",
                "Bushwalking");

        ArrayDeck[20] =
            new Card(
                "Melbourne",
                "U",
                "Victoria",
                2,
                "",
                "Wombats",
                "Bushwalking");

        ArrayDeck[21] =
            new Card(
                "The MCG",
                "V",
                "Victoria",
                2,
                "Leaves",
                "",
                "Indigenous Culture");

        ArrayDeck[22] =
            new Card(
                "Twelve Apostles",
                "W",
                "Victoria",
                2,
                "Shells",
                "",
                "Swimming");

        ArrayDeck[23] =
            new Card(
                "Royal Exhibition Building",
                "X",
                "Victoria",
                2,
                "Leaves",
                "Platypuses",
                "");

        ArrayDeck[24] =
            new Card(
                "Salamanca Markets",
                "Y",
                "Tasmania",
                7,
                "Leaves",
                "Emus",
                "");

        ArrayDeck[25] =
            new Card(
                "Mount Wellington",
                "Z",
                "Tasmania",
                7,
                "",
                "Koalas",
                "Sightseeing");

        ArrayDeck[26] =
            new Card(
                "Port Arthur",
                "*",
                "Tasmania",
                7,
                "Leaves",
                "",
                "Indigenous Culture");

        ArrayDeck[27] =
            new Card(
                "Richmond",
                "-",
                "Tasmania",
                7,
                "",
                "Kangaroos",
                "Swimming");

        string[] regions =
        {
            "Wester Australia",
            "Northern Territory",
            "Queensland",
            "South Australia",
            "New South Whales",
            "Victoria",
            "Tasmania"
        };

        List<string> finishedRegions = new();

        try
        {
            Deck = ArrayDeck.ToList();
            Shuffle(Deck);

            Server(
                numPlayers,
                numBots);

            // Dela ut sju kort.
            foreach (Player player in Players)
            {
                for (int i = 0; i < 7; i++)
                {
                    player.Hand.Add(Deck[0]);
                    Deck.RemoveAt(0);
                }
            }

            // Fyra rundor.
            for (int round = 0; round < 4; round++)
            {
                // Sex draft-steg.
                for (int i = 0; i < 6; i++)
                {
                    List<Task> tasks = new();

                    for (int p = 0; p < Players.Count; p++)
                    {
                        int currentPlayerIndex = p;

                        Player sendHand;

                        if (i < 5)
                        {
                            // Skicka handen till nästa spelare.
                            sendHand =
                                p < Players.Count - 1
                                    ? Players[p + 1]
                                    : Players[0];
                        }
                        else
                        {
                            // Sista kortet skickas åt andra hållet.
                            sendHand =
                                p > 0
                                    ? Players[p - 1]
                                    : Players[^1];
                        }

                        Player destination =
                            sendHand;

                        tasks.Add(
                            Task.Run(() =>
                            {
                                Players[currentPlayerIndex]
                                    .AddCardToDraft(destination);
                            }));
                    }

                    Task.WaitAll(tasks.ToArray());

                    // Ta emot handen från föregående spelare.
                    foreach (Player player in Players)
                    {
                        player.Hand.Clear();

                        foreach (Card card in player.NextHand)
                        {
                            player.Hand.Add(card);
                        }
                    }

                    // Första "throw"-kortet hålls dolt.
                    if (i > 0)
                    {
                        for (int pID = 0;
                             pID < Players.Count;
                             pID++)
                        {
                            Player draftedPlayer =
                                Players[pID];

                            foreach (Player receivingPlayer in Players)
                            {
                                receivingPlayer.SendMessage(
                                    "\nPlayer " +
                                    pID +
                                    " has drafted\n" +
                                    draftedPlayer.PrintCards(
                                        draftedPlayer.Draft.Skip(1)));
                            }
                        }
                    }
                }

                // Kontrollera färdiga regioner.
                foreach (string region in regions)
                {
                    bool regionComplete = false;

                    foreach (Player player in Players)
                    {
                        if (!finishedRegions.Contains(region) &&
                            player.CheckRegionComplete(region))
                        {
                            player.Region.Add(region);
                            player.RegionRoundScore += 3;

                            regionComplete = true;
                        }
                    }

                    if (regionComplete)
                    {
                        finishedRegions.Add(region);
                    }
                }

                // Lägg sista kortet till draften och räkna poäng.
                foreach (Player player in Players)
                {
                    player.Draft.Add(player.Hand[0]);
                    player.Hand.RemoveAt(0);

                    player.SendMessage(
                        "********************************\n" +
                        "Your draft this round: \n" +
                        player.PrintCards(player.Draft) +
                        "\n");

                    player.FinalScore =
                        player.RoundScore(round);

                    player.SendMessage(
                        "The following regions have now " +
                        "been completed: " +
                        string.Join(
                            ", ",
                            finishedRegions));
                }

                // Ny kortlek till nästa runda.
                Deck = ArrayDeck.ToList();
                Shuffle(Deck);

                foreach (Player player in Players)
                {
                    player.Draft.Clear();
                    player.Hand.Clear();

                    for (int i = 0; i < 7; i++)
                    {
                        player.Hand.Add(Deck[0]);
                        Deck.RemoveAt(0);
                    }
                }
            }

            Player highScore =
                Players[0];

            foreach (Player player in Players)
            {
                if (player.FinalScore >
                    highScore.FinalScore)
                {
                    highScore = player;
                }
            }

            int winnerIndex =
                Players.IndexOf(highScore);

            foreach (Player player in Players)
            {
                player.SendMessage(
                    "The winner is player: " +
                    winnerIndex +
                    " with " +
                    highScore.FinalScore +
                    " points");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.Message);
        }
    }

    public void Client(string ipAddress)
    {
        using TcpClient socket =
            new();

        socket.Connect(
            ipAddress,
            2048);

        using NetworkStream stream =
            socket.GetStream();

        using BinaryWriter outToServer =
            new(
                stream,
                System.Text.Encoding.UTF8,
                leaveOpen: true);

        using BinaryReader inFromServer =
            new(
                stream,
                System.Text.Encoding.UTF8,
                leaveOpen: true);

        string nextMessage = "";

        while (!nextMessage.Contains(
                   "winner",
                   StringComparison.OrdinalIgnoreCase))
        {
            nextMessage =
                inFromServer.ReadString();

            Console.WriteLine(nextMessage);

            if (nextMessage.Contains(
                    "Type",
                    StringComparison.OrdinalIgnoreCase) ||
                nextMessage.Contains(
                    "keep",
                    StringComparison.OrdinalIgnoreCase))
            {
                string response =
                    Console.ReadLine() ?? "";

                outToServer.Write(response);
                outToServer.Flush();
            }
        }
    }

    public void Server(
        int numberPlayers,
        int numberOfBots)
    {
        // Server-instansen är själv spelare 0.
        Players.Add(
            new Player(
                0,
                false,
                null,
                null,
                null));

        // Lägg till bottar.
        for (int i = 0;
             i < numberOfBots;
             i++)
        {
            Players.Add(
                new Player(
                    i + 1,
                    true,
                    null,
                    null,
                    null));
        }

        if (numberPlayers > 1)
        {
            AListener =
                new TcpListener(
                    IPAddress.Any,
                    2048);

            AListener.Start();
        }

        // Vänta på fjärrspelare.
        for (int i = numberOfBots + 1;
             i < numberPlayers + numberOfBots;
             i++)
        {
            TcpClient connection =
                AListener!.AcceptTcpClient();

            NetworkStream stream =
                connection.GetStream();

            BinaryReader inFromClient =
                new(
                    stream,
                    System.Text.Encoding.UTF8,
                    leaveOpen: true);

            BinaryWriter outToClient =
                new(
                    stream,
                    System.Text.Encoding.UTF8,
                    leaveOpen: true);

            Players.Add(
                new Player(
                    i,
                    false,
                    connection,
                    inFromClient,
                    outToClient));

            Console.WriteLine(
                "Connected to player " +
                i);

            outToClient.Write(
                "You connected to the server as player " +
                i +
                "\n");

            outToClient.Flush();
        }
    }

    private static void Shuffle<T>(
        IList<T> list)
    {
        for (int i = list.Count - 1;
             i > 0;
             i--)
        {
            int j =
                Random.Shared.Next(i + 1);

            (list[i], list[j]) =
                (list[j], list[i]);
        }
    }

    public static void Main(string[] args)
    {
        try
        {
            new BoomerangAustralia(args);
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.Message);
        }
    }
}