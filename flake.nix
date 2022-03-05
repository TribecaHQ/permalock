{
  description = "Tribeca development environment.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    saber-overlay.url = "github:saber-hq/saber-overlay";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, saber-overlay, flake-utils }:
    flake-utils.lib.eachSystem [
      "aarch64-darwin"
      "x86_64-linux"
      "x86_64-darwin"
    ] (system:
      let
        pkgs = (import nixpkgs { inherit system; })
          // saber-overlay.packages.${system};
        anchor = pkgs.anchor-0_22_0;
        ci = pkgs.buildEnv {
          name = "ci";
          paths = with pkgs;
            (pkgs.lib.optionals pkgs.stdenv.isLinux ([ udev ])) ++ [
              solana-basic
              anchor

              # sdk
              nodejs
              yarn
              python3

              pkgconfig
              openssl
              gnused

              libiconv
            ] ++ (pkgs.lib.optionals pkgs.stdenv.isDarwin [
              pkgs.darwin.apple_sdk.frameworks.AppKit
              pkgs.darwin.apple_sdk.frameworks.IOKit
              pkgs.darwin.apple_sdk.frameworks.Foundation
            ]);
        };
        env-release = pkgs.buildEnv {
          name = "env-release";
          paths = with pkgs;
            [ rust-stable cargo-workspaces pkgconfig openssl ]
            ++ (pkgs.lib.optionals pkgs.stdenv.isLinux ([ udev ]));
        };
      in {
        packages = {
          inherit ci env-release;
          inherit (pkgs) cargo-workspaces rust-stable;
        };
        devShell = pkgs.mkShell {
          buildInputs = with pkgs; [
            ci
            anchor
            rustup
            cargo-deps
            gh
            cargo-readme
            jq
          ];
        };
      });
}
