//! Instructions for the [crate::permalock] program.

pub mod create_permalock;
pub mod refresh_lock;
pub mod set_owner;
pub mod set_vote_delegate;

pub use create_permalock::*;
pub use refresh_lock::*;
pub use set_owner::*;
pub use set_vote_delegate::*;
