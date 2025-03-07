import argparse

class properties:
    def __init__(self):
        # Set up command line argument parser with defaults
        parser = argparse.ArgumentParser(description='Chess engine configuration')
        parser.add_argument('--milliseconds', type=int, default=1000, 
                            help='Thinking time in milliseconds (default: 1000)')
        parser.add_argument('--threads', type=int, default=4,
                            help='Number of threads (default: 4)')
        parser.add_argument('--hash', type=int, default=128,
                            help='Hash size in MB (default: 128)')
        args = parser.parse_args()

        # Set properties from parsed arguments
        self.milliseconds = args.milliseconds
        self.threads = args.threads
        self.hash = args.hash
        
        # Print configuration information
        print("\n=== Chess Engine Configuration ===")
        print(f"Thinking time: {self.milliseconds} ms")
        print(f"Threads: {self.threads}")
        print(f"Hash size: {self.hash} MB")
        print("================================\n")

# Create an instance of the properties class
properties = properties()