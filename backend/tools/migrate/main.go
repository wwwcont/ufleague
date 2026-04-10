package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {
	path := flag.String("path", "./migrations", "migrations directory")
	databaseURL := flag.String("database", "", "database url")
	flag.Parse()

	if *databaseURL == "" {
		log.Fatal("-database is required")
	}
	if flag.NArg() < 1 {
		log.Fatal("usage: migrate [up|down] [steps]")
	}

	m, err := migrate.New("file://"+*path, *databaseURL)
	if err != nil {
		log.Fatalf("init migrate: %v", err)
	}
	defer func() {
		_, _ = m.Close()
	}()

	cmd := flag.Arg(0)
	switch cmd {
	case "up":
		err = m.Up()
	case "down":
		steps := 1
		if flag.NArg() > 1 {
			steps, err = strconv.Atoi(flag.Arg(1))
			if err != nil {
				log.Fatalf("invalid steps: %v", err)
			}
		}
		err = m.Steps(-steps)
	default:
		log.Fatalf("unknown command: %s", cmd)
	}

	if err != nil && err != migrate.ErrNoChange {
		log.Fatalf("run migrate %s: %v", cmd, err)
	}

	if err == migrate.ErrNoChange {
		fmt.Fprintln(os.Stdout, "no change")
		return
	}
	fmt.Fprintln(os.Stdout, "ok")
}
